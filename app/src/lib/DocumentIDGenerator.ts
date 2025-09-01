import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG, TEXT_PROCESSING, CSV_HEADERS, ERROR_MESSAGES } from '../../../scripts/config/constants.js';
import { TextPreprocessingService, WordPair } from './TextPreprocessingService.js';

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
  private preprocessingService: TextPreprocessingService;

  constructor(minIdLength: number = DEFAULT_CONFIG.MIN_ID_LENGTH, maxMeanWordCount: number | null = null, verbose: boolean = false, verboseDocuments: Set<number> | number[] = new Set()) {
    this.validateConstructorParams(minIdLength, maxMeanWordCount, verbose);
    
    this.minIdLength = minIdLength;
    this.maxMeanWordCount = maxMeanWordCount;
    this.docWordCounts = new Map();
    this.vocabulary = new Set();
    this.verbose = verbose;
    this.verboseDocuments = this.normalizeVerboseDocuments(verboseDocuments);
    this.currentDocumentIndex = null;
    this.preprocessingService = new TextPreprocessingService(this.vocabulary, this.log.bind(this));
  }

  private validateConstructorParams(minIdLength: number, maxMeanWordCount: number | null, verbose: boolean): void {
    if (typeof minIdLength !== 'number' || minIdLength < 1) {
      throw new Error(ERROR_MESSAGES.MIN_ID_LENGTH);
    }
    if (maxMeanWordCount !== null && (typeof maxMeanWordCount !== 'number' || maxMeanWordCount < 0)) {
      throw new Error(ERROR_MESSAGES.MAX_MEAN_WORD_COUNT);
    }
    if (typeof verbose !== 'boolean') {
      throw new Error(ERROR_MESSAGES.VERBOSE);
    }
  }

  private normalizeVerboseDocuments(verboseDocuments: Set<number> | number[]): Set<number> {
    return verboseDocuments instanceof Set ? verboseDocuments : new Set(verboseDocuments || []);
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


  private buildDocWordCounts(documents: string[]): void {
    this.log('\n=== BUILDING WORD COUNTS ===');
    
    // Single pass: build vocabulary and word counts together
    const wordCounts = new Map<string, number>();
    
    // Build vocabulary using preprocessing service
    this.vocabulary = this.preprocessingService.buildVocabularyFromDocuments(documents);
    // Update the preprocessing service with the new vocabulary
    this.preprocessingService = new TextPreprocessingService(this.vocabulary, this.log.bind(this));
    
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
      
      // Update preprocessing service with loaded vocabulary
      this.preprocessingService = new TextPreprocessingService(this.vocabulary, this.log.bind(this));
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

  private shouldSkipDuplicateWord(lemmatized: string, usedWords: Set<string>, original: string, wordIndex: number): boolean {
    if (usedWords.has(lemmatized)) {
      this.log(`Skipped duplicate word "${original}" (lemmatized: "${lemmatized}") at position ${wordIndex}`);
      return true;
    }
    return false;
  }

  private addWordToSelection(
    wordPair: WordPair, 
    wordIndex: number, 
    idWords: WordData[], 
    usedWords: Set<string>
  ): { wordData: WordData; newLength: number; newTotalCount: number } {
    const { original, lemmatized } = wordPair;
    const wordCount = this.docWordCounts.get(lemmatized) || 0;
    
    const wordData: WordData = { word: original, lemmatized, wordCount, position: wordIndex };
    idWords.push(wordData);
    usedWords.add(lemmatized);
    
    const newLength = this.calculateCurrentIdLength(idWords);
    this.log(`Added "${original}" (lemmatized: "${lemmatized}", count: ${wordCount}, position: ${wordIndex}) to ID array`);
    
    return { wordData, newLength, newTotalCount: wordCount };
  }

  private logSelectionProgress(
    currentLength: number, 
    totalWordCount: number, 
    idWordsLength: number, 
    hasMinLength: boolean, 
    meanBelowThreshold: boolean
  ): void {
    const meanWordCount = this.calculateMeanWordCount(totalWordCount, idWordsLength);
    this.log(`Current length: ${currentLength}, Mean word count: ${meanWordCount.toFixed(2)} (threshold: ${this.maxMeanWordCount})`);
    this.log(`Min length met: ${hasMinLength}, Mean below threshold: ${meanBelowThreshold}`);
  }

  private shouldStopSelection(currentLength: number, totalWordCount: number, idWordsLength: number): boolean {
    const hasMinLength = currentLength >= this.minIdLength;
    const meanWordCount = this.calculateMeanWordCount(totalWordCount, idWordsLength);
    const meanBelowThreshold = this.isMeanBelowThreshold(meanWordCount);
    
    this.logSelectionProgress(currentLength, totalWordCount, idWordsLength, hasMinLength, meanBelowThreshold);
    
    if (hasMinLength && meanBelowThreshold) {
      this.log('Both conditions met, stopping');
      return true;
    }
    
    return false;
  }

  private handleMeanThresholdExceeded(
    idWords: WordData[], 
    removedWords: WordData[], 
    usedWords: Set<string>, 
    totalWordCount: number
  ): { newLength: number; newTotalCount: number } {
    const { newLength, removedCount } = this.removeHighestCountWord(idWords, removedWords, usedWords);
    return { newLength, newTotalCount: totalWordCount - removedCount };
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
      const wordPair = wordPairs[wordIndex];
      
      if (this.shouldSkipDuplicateWord(wordPair.lemmatized, usedWords, wordPair.original, wordIndex)) {
        wordIndex++;
        continue;
      }
      
      const addResult = this.addWordToSelection(wordPair, wordIndex, idWords, usedWords);
      currentLength = addResult.newLength;
      totalWordCount += addResult.newTotalCount;
      
      if (this.shouldStopSelection(currentLength, totalWordCount, idWords.length)) {
        break;
      }
      
      const meanWordCount = this.calculateMeanWordCount(totalWordCount, idWords.length);
      if (!this.isMeanBelowThreshold(meanWordCount)) {
        const handleResult = this.handleMeanThresholdExceeded(idWords, removedWords, usedWords, totalWordCount);
        currentLength = handleResult.newLength;
        totalWordCount = handleResult.newTotalCount;
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
    
    const wordPairs = this.preprocessingService.preprocessText(document, true);
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