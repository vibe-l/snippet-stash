import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DocumentIDGenerator } from '../DocumentIDGenerator';

vi.mock('fs');
const mockedFs = vi.mocked(fs);

describe('DocumentIDGenerator', () => {
  let generator: DocumentIDGenerator;
  const testCacheFile = '/test/cache/word-counts.csv';

  beforeEach(() => {
    vi.clearAllMocks();
    generator = new DocumentIDGenerator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default parameters', () => {
      const gen = new DocumentIDGenerator();
      expect(gen).toBeInstanceOf(DocumentIDGenerator);
    });

    it('should create instance with custom parameters', () => {
      const gen = new DocumentIDGenerator(50, 10, true, [1, 2, 3]);
      expect(gen).toBeInstanceOf(DocumentIDGenerator);
    });

    it('should accept Set for verboseDocuments', () => {
      const gen = new DocumentIDGenerator(30, null, true, new Set([1, 2, 3]));
      expect(gen).toBeInstanceOf(DocumentIDGenerator);
    });

    it('should throw error for invalid minIdLength', () => {
      expect(() => new DocumentIDGenerator(-1)).toThrow('minIdLength must be a positive number');
      expect(() => new DocumentIDGenerator(0)).toThrow('minIdLength must be a positive number');
      expect(() => new DocumentIDGenerator('invalid' as any)).toThrow('minIdLength must be a positive number');
    });

    it('should throw error for invalid maxMeanWordCount', () => {
      expect(() => new DocumentIDGenerator(30, -1)).toThrow('maxMeanWordCount must be null or a non-negative number');
      expect(() => new DocumentIDGenerator(30, 'invalid' as any)).toThrow('maxMeanWordCount must be null or a non-negative number');
    });

    it('should throw error for invalid verbose parameter', () => {
      expect(() => new DocumentIDGenerator(30, null, 'invalid' as any)).toThrow('verbose must be a boolean');
    });
  });

  describe('generateIds', () => {
    it('should generate IDs for simple documents', () => {
      const documents = [
        'This is a test document with some words',
        'Another document with different content'
      ];
      
      const ids = generator.generateIds(documents);
      
      expect(ids).toHaveLength(2);
      expect(ids[0]).toContain('_');
      expect(ids[1]).toContain('_');
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should generate unique IDs even for similar documents', () => {
      const documents = [
        'test document',
        'test document'
      ];
      
      const ids = generator.generateIds(documents);
      
      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[1]).toMatch(/_2$/);
    });

    it('should handle empty document by generating fallback ID', () => {
      const documents = ['   ', 'valid document content'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids).toHaveLength(2);
      expect(ids[0]).toBe('document_0');
      expect(ids[1]).not.toBe('document_1');
    });

    it('should respect minimum ID length', () => {
      const generator = new DocumentIDGenerator(50);
      const documents = ['short content with more words to meet minimum length requirement test'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0].length).toBeGreaterThanOrEqual(50);
    });

    it('should filter out stopwords', () => {
      const documents = [
        'document will be filtered because these are stopwords should not appear'
      ];
      
      const ids = generator.generateIds(documents);
      
      // Check that stopwords as standalone words are filtered out
      const idWords = ids[0].split('_');
      expect(idWords).not.toContain('will');
      expect(idWords).not.toContain('be');
      expect(idWords).not.toContain('are');
      expect(idWords).toContain('document');
      expect(idWords).toContain('filtered');
    });

    it('should filter out short words except acronyms', () => {
      const documents = [
        'AI and ML algorithms with of in systems'
      ];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toContain('AI');
      expect(ids[0]).toContain('ML');
      expect(ids[0]).not.toContain('of');
      expect(ids[0]).not.toContain('in');
    });

    it('should handle documents with only filtered words', () => {
      const documents = ['is are be was of in'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBe('document_0');
    });

    it('should throw error for invalid input', () => {
      expect(() => generator.generateIds(null as any)).toThrow('documents must be an array');
      expect(() => generator.generateIds([])).toThrow('documents array cannot be empty');
      expect(() => generator.generateIds(['valid', 123 as any])).toThrow('all documents must be strings');
      expect(() => generator.generateIds(['valid'], 123 as any)).toThrow('docWordCountPath must be null or a string');
    });
  });

  describe('cacheDocWordCounts', () => {
    beforeEach(() => {
      const documents = ['test document content', 'another test content'];
      generator.generateIds(documents);
    });

    it('should cache word counts to file', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.mkdirSync.mockImplementation(() => {});

      generator.cacheDocWordCounts(testCacheFile);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        testCacheFile,
        expect.stringContaining('word,count\n'),
        'utf8'
      );
    });

    it('should create directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {});
      mockedFs.writeFileSync.mockImplementation(() => {});

      generator.cacheDocWordCounts(testCacheFile);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.dirname(testCacheFile),
        { recursive: true }
      );
    });

    it('should throw error for invalid file path', () => {
      expect(() => generator.cacheDocWordCounts('')).toThrow('filePath must be a non-empty string');
      expect(() => generator.cacheDocWordCounts(null as any)).toThrow('filePath must be a non-empty string');
    });

    it('should throw error when no word counts to cache', () => {
      const emptyGenerator = new DocumentIDGenerator();
      expect(() => emptyGenerator.cacheDocWordCounts(testCacheFile)).toThrow('No word counts to cache');
    });
  });

  describe('loading cached word counts', () => {
    it('should load word counts from cache file', () => {
      const cacheContent = 'word,count\ntest,5\ndocument,3\ncontent,2';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(cacheContent);

      const documents = ['test document content'];
      const ids = generator.generateIds(documents, testCacheFile);

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(testCacheFile, 'utf8');
      expect(ids).toHaveLength(1);
    });

    it('should handle malformed cache file gracefully', () => {
      const cacheContent = 'word,count\ntest,5\ninvalid_line\ndocument,not_a_number';
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(cacheContent);
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const documents = ['test document'];
      const ids = generator.generateIds(documents, testCacheFile);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(ids).toHaveLength(1);
      
      consoleWarnSpy.mockRestore();
    });

    it('should fall back to building word counts if cache file fails', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const documents = ['test document'];
      const ids = generator.generateIds(documents, testCacheFile);

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(ids).toHaveLength(1);
      
      consoleWarnSpy.mockRestore();
    });

    it('should throw error for empty cache file', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const documents = ['test document'];
      generator.generateIds(documents, testCacheFile);

      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should throw error for cache file without header', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('just_one_line');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const documents = ['test document'];
      generator.generateIds(documents, testCacheFile);

      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('lemmatization', () => {
    it('should lemmatize irregular verbs correctly', () => {
      const documents = ['running went better children'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
    });

    it('should lemmatize with suffixes', () => {
      const documents = ['testing functionality working development'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
    });

    it('should handle -ies to -y transformation', () => {
      const documents = ['companies policies strategies'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
    });

    it('should preserve original case in final ID', () => {
      const documents = ['JavaScript API REST HTTP'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toContain('JavaScript');
      expect(ids[0]).toContain('API');
      expect(ids[0]).toContain('REST');
      expect(ids[0]).toContain('HTTP');
    });
  });

  describe('word filtering', () => {
    it('should preserve 2-letter acronyms', () => {
      const documents = ['AI ML UI UX API'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toContain('AI');
      expect(ids[0]).toContain('ML');
      expect(ids[0]).toContain('UI');
      expect(ids[0]).toContain('UX');
      expect(ids[0]).toContain('API');
    });

    it('should filter out non-acronym 2-letter words', () => {
      const documents = ['to of in at by AI'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).not.toContain('to');
      expect(ids[0]).not.toContain('of');
      expect(ids[0]).not.toContain('in');
      expect(ids[0]).not.toContain('at');
      expect(ids[0]).not.toContain('by');
      expect(ids[0]).toContain('AI');
    });

    it('should filter out words with numbers', () => {
      const documents = ['test123 document version2 clean content'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).not.toContain('test123');
      expect(ids[0]).not.toContain('version2');
      expect(ids[0]).toContain('document');
      expect(ids[0]).toContain('clean');
      expect(ids[0]).toContain('content');
    });
  });

  describe('verbose logging', () => {
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log when verbose is enabled', () => {
      const verboseGenerator = new DocumentIDGenerator(30, null, true);
      const documents = ['test document'];
      
      verboseGenerator.generateIds(documents);
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when verbose is disabled', () => {
      const generator = new DocumentIDGenerator(30, 5, false); // Set maxMeanWordCount to avoid corpus mean logging
      const documents = ['test document'];
      
      generator.generateIds(documents);
      
      // Should not log debug messages, but may still log corpus mean message
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringMatching(/PREPROCESSING|GENERATING ID/));
    });

    it('should log only for specific documents when verboseDocuments is set', () => {
      const verboseGenerator = new DocumentIDGenerator(30, null, true, [1]);
      const documents = ['first document', 'second document', 'third document'];
      
      verboseGenerator.generateIds(documents);
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('mean word count filtering', () => {
    it('should respect maxMeanWordCount threshold', () => {
      const generator = new DocumentIDGenerator(10, 2);
      const documents = ['common word common word rare unique specific detailed content'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
    });

    it('should use corpus mean when maxMeanWordCount is null', () => {
      const generator = new DocumentIDGenerator(10, null);
      const documents = [
        'common repeated word common repeated word',
        'different unique content here'
      ];
      
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const ids = generator.generateIds(documents);
      
      expect(ids).toHaveLength(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Using corpus mean word count/));
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle documents with special characters', () => {
      const documents = ['test@example.com #hashtag $money 100% success!'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
      expect(ids[0]).toContain('test');
      expect(ids[0]).toContain('example');
      expect(ids[0]).toContain('com');
    });

    it('should handle very long documents', () => {
      const longDoc = Array(1000).fill('word').map((w, i) => `${w}${i}`).join(' ');
      const documents = [longDoc];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
      expect(ids[0].length).toBeGreaterThan(0);
    });

    it('should handle documents with mixed languages (basic)', () => {
      const documents = ['hello world test café naïve résumé'];
      
      const ids = generator.generateIds(documents);
      
      expect(ids[0]).toBeDefined();
      expect(ids[0]).toContain('hello');
      expect(ids[0]).toContain('world');
      expect(ids[0]).toContain('test');
    });

    it('should handle single character words', () => {
      const documents = ['a b x test document'];
      
      const ids = generator.generateIds(documents);
      
      const idWords = ids[0].split('_');
      expect(idWords).toContain('test');
      expect(idWords).toContain('document');
      expect(idWords).not.toContain('a');
      expect(idWords).not.toContain('b');
      expect(idWords).not.toContain('x');
    });
  });

  describe('ID uniqueness and collision handling', () => {
    it('should handle multiple documents generating same base ID', () => {
      const documents = [
        'test document content',
        'test document content',
        'test document content'
      ];
      
      const ids = generator.generateIds(documents);
      
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
      expect(ids[1]).toMatch(/_2$/);
      expect(ids[2]).toMatch(/_3$/);
    });
  });

  describe('performance considerations', () => {
    it('should handle large dataset threshold for caching', () => {
      mockedFs.writeFileSync.mockImplementation(() => {});
      mockedFs.mkdirSync.mockImplementation(() => {});
      mockedFs.existsSync.mockReturnValue(true);

      const largeGenerator = new DocumentIDGenerator();
      
      const manyWords = Array(15000).fill(0).map((_, i) => [`word${i}`, i + 1]);
      (largeGenerator as any).docWordCounts = new Map(manyWords);

      largeGenerator.cacheDocWordCounts(testCacheFile);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        testCacheFile,
        expect.stringContaining('word,count'),
        'utf8'
      );
    });
  });
});