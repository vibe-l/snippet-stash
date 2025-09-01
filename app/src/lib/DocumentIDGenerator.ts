import fs from 'fs';
import path from 'path';
import { IRREGULAR_MAPPINGS, SUFFIXES } from '../../../scripts/config/lemmatization.js';
import { DEFAULT_CONFIG, STOPWORDS, TEXT_PROCESSING, FILE_EXTENSIONS, CSV_HEADERS, ERROR_MESSAGES } from '../../../scripts/config/constants.js';

interface WordPair {
  original: string;
  lemmatized: string;
}

interface WordData {
  word: string;
  lemmatized: string;
  wordCount: number;
  position: number;
}

export class DocumentIDGenerator {
  private minIdLength: number;
  private maxMeanWordCount: number | null;
  private docWordCounts: Map<string, number>;
  private vocabulary: Set<string>;
  private verbose: boolean;
  private verboseDocuments: Set<number>;
  private currentDocumentIndex: number | null;

  constructor(minIdLength: number = DEFAULT_CONFIG.MIN_ID_LENGTH, maxMeanWordCount: number | null = null, verbose: boolean = false, verboseDocuments: Set<number> | number[] = new Set()) {
    // Input validation
    if (typeof minIdLength !== 'number' || minIdLength < 1) {
      throw new Error(ERROR_MESSAGES.MIN_ID_LENGTH);
    }
    if (maxMeanWordCount !== null && (typeof maxMeanWordCount !== 'number' || maxMeanWordCount < 0)) {
      throw new Error(ERROR_MESSAGES.MAX_MEAN_WORD_COUNT);
    }
    if (typeof verbose !== 'boolean') {
      throw new Error(ERROR_MESSAGES.VERBOSE);
    }
    
    this.minIdLength = minIdLength;
    this.maxMeanWordCount = maxMeanWordCount;
    this.docWordCounts = new Map();
    this.vocabulary = new Set(); // Set of all unique words from corpus
    this.verbose = verbose;
    this.verboseDocuments = verboseDocuments instanceof Set ? verboseDocuments : new Set(verboseDocuments || []); // Always ensure it's a Set
    this.currentDocumentIndex = null; // Track which document we're currently processing
  }

  private log(...args: any[]): void {
    if (this.verbose) {
      // If verboseDocuments has entries, only log for those document indices
      if (this.verboseDocuments.size > 0 && this.currentDocumentIndex !== null) {
        if (this.verboseDocuments.has(this.currentDocumentIndex)) {
          console.log(...args);
        }
      } else if (this.verboseDocuments.size === 0) {
        // If no specific documents specified, log everything (original behavior)
        console.log(...args);
      }
    }
  }

  private is2LetterAcronym(originalWord: string): boolean {
    return originalWord.length === 2 && originalWord === originalWord.toUpperCase();
  }

  private shouldSkip2LetterWord(originalWord: string): boolean {
    return originalWord.length === 2 && !this.is2LetterAcronym(originalWord);
  }

  private lemmatizeWord(word: string): string {
    // Check irregular mappings first
    if (IRREGULAR_MAPPINGS[word] && this.vocabulary.has(IRREGULAR_MAPPINGS[word])) {
      this.log(`  Irregular lemmatized "${word}" → "${IRREGULAR_MAPPINGS[word]}"`);
      return IRREGULAR_MAPPINGS[word];
    }
    
    // Try removing each suffix and check if resulting lemma exists in vocabulary
    for (const suffix of SUFFIXES) {
      if (word.endsWith(suffix) && word.length > suffix.length + DEFAULT_CONFIG.MIN_LEMMA_LENGTH - 1) {
        const lemma = word.slice(0, -suffix.length);
        if (this.vocabulary.has(lemma)) {
          this.log(`  Suffix lemmatized "${word}" → "${lemma}"`);
          return lemma;
        }
      }
    }
    
    // Special case for -ies → -y
    if (word.endsWith('ies') && word.length > 5) {
      const lemma = word.slice(0, -3) + 'y';
      if (this.vocabulary.has(lemma)) {
        this.log(`  Special lemmatized "${word}" → "${lemma}"`);
        return lemma;
      }
    }
    
    return word; // Return original if no valid lemma found
  }

  private preprocessText(text: string): string[];
  private preprocessText(text: string, returnOriginals: true): WordPair[];
  private preprocessText(text: string, returnOriginals: boolean = false): string[] | WordPair[] {
    this.log(`\n=== PREPROCESSING TEXT: "${text}" ===`);
    
    // Split text into words while preserving original case
    const originalWords = text
      .replace(TEXT_PROCESSING.WORD_REGEX, ' ')
      .replace(TEXT_PROCESSING.WHITESPACE_REGEX, ' ')
      .trim()
      .split(' ');
    
    // Filter and process words
    const validWords: string[] = [];
    const validOriginalWords: string[] = [];
    
    for (const originalWord of originalWords) {
      const lowerWord = originalWord.toLowerCase();
      
      if (lowerWord.length >= DEFAULT_CONFIG.MIN_WORD_LENGTH && !TEXT_PROCESSING.NUMBER_REGEX.test(lowerWord) && !STOPWORDS.has(lowerWord) && !this.shouldSkip2LetterWord(originalWord)) {
        validWords.push(lowerWord);
        validOriginalWords.push(originalWord);
      }
    }
    
    if (returnOriginals) {
      // Return array of objects with original case and lemmatized versions
      const wordPairs: WordPair[] = validWords.map((word, index) => ({
        original: validOriginalWords[index], // Keep original case
        lemmatized: this.vocabulary.size > 0 ? this.lemmatizeWord(word) : word
      }));
      this.log(`Preprocessed word pairs:`, wordPairs);
      return wordPairs;
    } else {
      // Apply lemmatization if vocabulary is available (for word count building)
      const processedWords = this.vocabulary.size > 0 
        ? validWords.map(word => this.lemmatizeWord(word))
        : validWords;
      
      this.log(`Preprocessed words:`, processedWords);
      return processedWords;
    }
  }

  private buildDocWordCounts(documents: string[]): void {
    this.log('\n=== BUILDING WORD COUNTS ===');
    
    // Single pass: build vocabulary and word counts together
    const wordCounts = new Map<string, number>();
    
    // First build vocabulary from raw words
    for (const doc of documents) {
      const originalWords = doc
        .replace(TEXT_PROCESSING.WORD_REGEX, ' ')
        .replace(TEXT_PROCESSING.WHITESPACE_REGEX, ' ')
        .trim()
        .split(' ');
      
      for (const originalWord of originalWords) {
        const lowerWord = originalWord.toLowerCase();
        
        if (lowerWord.length >= DEFAULT_CONFIG.MIN_WORD_LENGTH && !TEXT_PROCESSING.NUMBER_REGEX.test(lowerWord) && !STOPWORDS.has(lowerWord) && !this.shouldSkip2LetterWord(originalWord)) {
          this.vocabulary.add(lowerWord);
        }
      }
    }
    this.log(`Vocabulary built with ${this.vocabulary.size} unique words`);
    
    // Then build word counts with lemmatization in same loop
    for (const doc of documents) {
      const words = this.preprocessText(doc); // This returns lemmatized words for counting
      const uniqueWordsInDoc = new Set(words);
      
      for (const word of uniqueWordsInDoc) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    this.docWordCounts = wordCounts;
    this.log('Word counts built:', Array.from(this.docWordCounts.entries()));
  }

  private loadDocWordCounts(filePath: string): void {
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
      
      this.log(`Loaded ${loadedCount} word counts and built vocabulary from cache`);
      
    } catch (error) {
      throw new Error(`Failed to load doc word counts from ${filePath}: ${(error as Error).message}`);
    }
  }

  private calculateCurrentIdLength(idWords: WordData[]): number {
    return idWords.map(w => w.word).join('_').length;
  }

  private calculateMeanWordCount(totalWordCount: number, wordCount: number): number {
    return totalWordCount / wordCount;
  }

  private isMeanBelowThreshold(meanWordCount: number): boolean {
    return meanWordCount <= (this.maxMeanWordCount || Infinity);
  }

  private findHighestCountWordIndex(idWords: WordData[]): number {
    let maxCount = -1;
    let maxIndex = -1;
    for (let i = 0; i < idWords.length; i++) {
      if (idWords[i].wordCount > maxCount) {
        maxCount = idWords[i].wordCount;
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  private removeHighestCountWord(
    idWords: WordData[], 
    removedWords: WordData[], 
    usedWords: Set<string>
  ): { newLength: number; removedCount: number } {
    const maxIndex = this.findHighestCountWordIndex(idWords);
    
    if (maxIndex === -1) {
      return { newLength: this.calculateCurrentIdLength(idWords), removedCount: 0 };
    }
    
    const removedWord = idWords[maxIndex];
    removedWords.push(removedWord);
    idWords.splice(maxIndex, 1);
    usedWords.delete(removedWord.lemmatized);
    
    const newLength = this.calculateCurrentIdLength(idWords);
    this.log(`Removed "${removedWord.word}" (lemmatized: "${removedWord.lemmatized}", count: ${removedWord.wordCount}, position: ${removedWord.position}) - highest count`);
    
    return { newLength, removedCount: removedWord.wordCount };
  }

  private findInsertionIndex(idWords: WordData[], targetPosition: number): number {
    let insertIndex = 0;
    for (let i = 0; i < idWords.length; i++) {
      if (idWords[i].position < targetPosition) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    return insertIndex;
  }

  private addWordBackToId(
    wordObj: WordData, 
    idWords: WordData[], 
    usedWords: Set<string>
  ): number {
    const insertIndex = this.findInsertionIndex(idWords, wordObj.position);
    idWords.splice(insertIndex, 0, wordObj);
    usedWords.add(wordObj.lemmatized);
    
    const newLength = this.calculateCurrentIdLength(idWords);
    this.log(`Added back "${wordObj.word}" (lemmatized: "${wordObj.lemmatized}", count: ${wordObj.wordCount}) at position ${insertIndex}`);
    this.log(`New length: ${newLength}`);
    
    return newLength;
  }

  private restoreWordsForMinimumLength(
    idWords: WordData[], 
    removedWords: WordData[], 
    usedWords: Set<string>, 
    currentLength: number
  ): number {
    if (currentLength >= this.minIdLength || removedWords.length === 0) {
      return currentLength;
    }
    
    this.log(`\n=== ID LENGTH BELOW MINIMUM (${currentLength} < ${this.minIdLength}) ===`);
    this.log('Attempting to add back removed words...');
    
    removedWords.sort((a, b) => a.wordCount - b.wordCount);
    this.log('Removed words sorted by count:', removedWords.map(w => `${w.word}(${w.wordCount})`));
    
    let updatedLength = currentLength;
    
    for (const wordObj of removedWords) {
      if (usedWords.has(wordObj.lemmatized)) {
        this.log(`Skipped adding back duplicate word "${wordObj.word}" (lemmatized: "${wordObj.lemmatized}")`);
        continue;
      }
      
      updatedLength = this.addWordBackToId(wordObj, idWords, usedWords);
      
      if (updatedLength >= this.minIdLength) {
        this.log('Minimum length requirement met, stopping');
        break;
      }
    }
    
    return updatedLength;
  }

  private selectWordsForId(wordPairs: WordPair[]): { idWords: WordData[]; removedWords: WordData[] } {
    const idWords: WordData[] = [];
    const removedWords: WordData[] = [];
    const usedWords = new Set<string>();
    let wordIndex = 0;
    let currentLength = 0;
    let totalWordCount = 0;
    
    this.log('Starting word selection...');
    
    while (wordIndex < wordPairs.length) {
      const { original, lemmatized } = wordPairs[wordIndex];
      const wordCount = this.docWordCounts.get(lemmatized) || 0;
      
      if (usedWords.has(lemmatized)) {
        this.log(`Skipped duplicate word "${original}" (lemmatized: "${lemmatized}") at position ${wordIndex}`);
        wordIndex++;
        continue;
      }
      
      const wordData: WordData = { word: original, lemmatized, wordCount, position: wordIndex };
      idWords.push(wordData);
      usedWords.add(lemmatized);
      currentLength = this.calculateCurrentIdLength(idWords);
      totalWordCount += wordCount;
      
      this.log(`Added "${original}" (lemmatized: "${lemmatized}", count: ${wordCount}, position: ${wordIndex}) to ID array`);
      
      const hasMinLength = currentLength >= this.minIdLength;
      const meanWordCount = this.calculateMeanWordCount(totalWordCount, idWords.length);
      const meanBelowThreshold = this.isMeanBelowThreshold(meanWordCount);
      
      this.log(`Current length: ${currentLength}, Mean word count: ${meanWordCount.toFixed(2)} (threshold: ${this.maxMeanWordCount})`);
      this.log(`Min length met: ${hasMinLength}, Mean below threshold: ${meanBelowThreshold}`);
      
      if (hasMinLength && meanBelowThreshold) {
        this.log('Both conditions met, stopping');
        break;
      }
      
      if (!meanBelowThreshold) {
        const { newLength, removedCount } = this.removeHighestCountWord(idWords, removedWords, usedWords);
        currentLength = newLength;
        totalWordCount -= removedCount;
      }
      
      wordIndex++;
    }
    
    const finalLength = this.restoreWordsForMinimumLength(idWords, removedWords, usedWords, currentLength);
    return { idWords, removedWords };
  }

  private generateId(document: string, documentIndex: number): string {
    this.currentDocumentIndex = documentIndex;
    this.log(`\n=== GENERATING ID FOR DOCUMENT ${documentIndex} ===`);
    this.log(`Document: "${document}"`);
    
    const wordPairs = this.preprocessText(document, true);
    if (wordPairs.length === 0) {
      return `document_${documentIndex}`;
    }
    
    const { idWords } = this.selectWordsForId(wordPairs);
    
    if (idWords.length === 0) {
      return `document_${documentIndex}`;
    }
    
    const finalId = idWords.map(w => w.word).join('_');
    this.log(`Final ID: "${finalId}"`);
    return finalId;
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

  generateIds(documents: string[], docWordCountPath: string | null = null): string[] {
    // Input validation
    if (!Array.isArray(documents)) {
      throw new Error(ERROR_MESSAGES.DOCUMENTS_ARRAY);
    }
    if (documents.length === 0) {
      throw new Error(ERROR_MESSAGES.DOCUMENTS_EMPTY);
    }
    if (!documents.every(doc => typeof doc === 'string')) {
      throw new Error(ERROR_MESSAGES.DOCUMENTS_STRINGS);
    }
    if (docWordCountPath !== null && typeof docWordCountPath !== 'string') {
      throw new Error(ERROR_MESSAGES.DOC_WORD_COUNT_PATH);
    }
    
    // Load existing data from cache files if available
    try {
      if (docWordCountPath && fs.existsSync(docWordCountPath)) {
        this.loadDocWordCounts(docWordCountPath);
      } else {
        this.buildDocWordCounts(documents);
      }
    } catch (error) {
      console.warn(`Warning: ${(error as Error).message}. Falling back to building word counts from documents.`);
      this.buildDocWordCounts(documents);
    }
    
    // Calculate mean word count from corpus and use it if maxMeanWordCount wasn't set
    if (this.docWordCounts.size > 0) {
      const totalWordCount = Array.from(this.docWordCounts.values()).reduce((sum, count) => sum + count, 0);
      const corpusMeanWordCount = totalWordCount / this.docWordCounts.size;
      
      if (this.maxMeanWordCount === null) {
        this.maxMeanWordCount = corpusMeanWordCount;
        console.log(`Using corpus mean word count: ${corpusMeanWordCount}`);
      } else {
        console.log(`Corpus mean word count: ${corpusMeanWordCount.toFixed(2)}, using maxMeanWordCount: ${this.maxMeanWordCount}`);
      }
    }
    
    const ids: string[] = [];
    const usedIds = new Set<string>();
    
    for (let i = 0; i < documents.length; i++) {
      let id = this.generateId(documents[i], i);
      
      // Ensure uniqueness among generated IDs
      let counter = 1;
      let originalId = id;
      while (usedIds.has(id)) {
        counter++;
        id = `${originalId}_${counter}`;
      }
      
      usedIds.add(id);
      ids.push(id);
    }
    
    return ids;
  }
}