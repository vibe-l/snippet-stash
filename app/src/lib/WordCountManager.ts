import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG, CSV_HEADERS, ERROR_MESSAGES } from '../config/constants.js';
import { TextPreprocessingService } from './TextPreprocessingService.js';

export class WordCountManager {
  private docWordCounts: Map<string, number>;
  private vocabulary: Set<string>;
  private preprocessingService: TextPreprocessingService;
  private log: (...args: any[]) => void;

  constructor(vocabulary: Set<string>, logFunction: (...args: any[]) => void) {
    this.docWordCounts = new Map();
    this.vocabulary = vocabulary;
    this.log = logFunction;
    this.preprocessingService = new TextPreprocessingService(this.vocabulary, this.log);
  }

  getDocWordCounts(): Map<string, number> {
    return this.docWordCounts;
  }

  getVocabulary(): Set<string> {
    return this.vocabulary;
  }

  getPreprocessingService(): TextPreprocessingService {
    return this.preprocessingService;
  }

  buildDocWordCounts(documents: string[]): void {
    this.log('\n=== BUILDING WORD COUNTS ===');
    
    // Single pass: build vocabulary and word counts together
    const wordCounts = new Map<string, number>();
    
    // Build vocabulary using preprocessing service
    this.vocabulary = this.preprocessingService.buildVocabularyFromDocuments(documents);
    // Update the preprocessing service with the new vocabulary
    this.preprocessingService = new TextPreprocessingService(this.vocabulary, this.log);
    
    // Then build word counts with lemmatization
    for (const doc of documents) {
      const words = this.preprocessingService.preprocessText(doc); // This returns lemmatized words for counting
      const uniqueWordsInDoc = new Set(words);
      
      for (const word of uniqueWordsInDoc) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    this.docWordCounts = wordCounts;
    this.log('Word counts built:', Array.from(this.docWordCounts.entries()));
  }

  loadDocWordCounts(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`${ERROR_MESSAGES.FILE_NOT_EXIST}: ${filePath}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.trim()) {
        throw new Error(ERROR_MESSAGES.FILE_EMPTY);
      }
      
      const lines = content.split('\n');
      if (lines.length < 2) {
        throw new Error(ERROR_MESSAGES.FILE_HEADER);
      }
      
      const dataLines = lines.slice(1); // Skip header
      let loadedCount = 0;
      
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (line) {
          const parts = line.split(',');
          if (parts.length !== 2) {
            console.warn(`Warning: Skipping malformed line ${i + 2}: "${line}"`);
            continue;
          }
          
          const [word, countStr] = parts;
          const countNum = parseInt(countStr, 10);
          
          if (isNaN(countNum) || countNum < 0) {
            console.warn(`Warning: Skipping line ${i + 2} with invalid count: "${countStr}"`);
            continue;
          }
          
          this.docWordCounts.set(word, countNum);
          this.vocabulary.add(word);
          loadedCount++;
        }
      }
      
      // Update preprocessing service with loaded vocabulary
      this.preprocessingService = new TextPreprocessingService(this.vocabulary, this.log);
      this.log(`Loaded ${loadedCount} word counts and built vocabulary from cache`);
      
    } catch (error) {
      throw new Error(`Failed to load doc word counts from ${filePath}: ${(error as Error).message}`);
    }
  }

  cacheDocWordCounts(filePath: string): void {
    try {
      if (typeof filePath !== 'string' || !filePath.trim()) {
        throw new Error(ERROR_MESSAGES.FILE_PATH_STRING);
      }
      
      if (this.docWordCounts.size === 0) {
        throw new Error(ERROR_MESSAGES.NO_WORD_COUNTS);
      }
      
      // Build CSV content directly without intermediate array for large datasets
      let csvContent = CSV_HEADERS.WORD_COUNT + '\n';
      
      if (this.docWordCounts.size < DEFAULT_CONFIG.LARGE_DATASET_THRESHOLD) {
        // For smaller datasets, sort normally
        const sortedCounts = Array.from(this.docWordCounts.entries())
          .sort((a, b) => b[1] - a[1]);
        csvContent += sortedCounts.map(([word, count]) => `${word},${count}`).join('\n');
      } else {
        // For larger datasets, write unsorted to avoid memory pressure
        for (const [word, count] of this.docWordCounts.entries()) {
          csvContent += `${word},${count}\n`;
        }
      }
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, csvContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to cache doc word counts to ${filePath}: ${(error as Error).message}`);
    }
  }

  calculateCorpusStats(): { totalWordCount: number; corpusMeanWordCount: number } {
    if (this.docWordCounts.size === 0) {
      return { totalWordCount: 0, corpusMeanWordCount: 0 };
    }
    
    const totalWordCount = Array.from(this.docWordCounts.values()).reduce((sum, count) => sum + count, 0);
    const corpusMeanWordCount = totalWordCount / this.docWordCounts.size;
    
    return { totalWordCount, corpusMeanWordCount };
  }
}