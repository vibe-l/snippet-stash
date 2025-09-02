import fs from 'fs';
import { DEFAULT_CONFIG, TEXT_PROCESSING, ERROR_MESSAGES } from '../config/constants.js';
import { TextPreprocessingService, WordPair } from './TextPreprocessingService.js';
import { WordCountManager } from './WordCountManager.js';
import { WordSelectionStrategy, WordData, WordSelectionResult } from './WordSelectionStrategy.js';


export class DocumentIDGenerator {
  private minIdLength: number;
  private maxMeanWordCount: number | null;
  private verbose: boolean;
  private verboseDocuments: Set<number>;
  private currentDocumentIndex: number | null;
  private wordCountManager: WordCountManager;
  private wordSelectionStrategy: WordSelectionStrategy;

  constructor(minIdLength: number = DEFAULT_CONFIG.MIN_ID_LENGTH, maxMeanWordCount: number | null = null, verbose: boolean = false, verboseDocuments: Set<number> | number[] = new Set()) {
    this.validateConstructorParams(minIdLength, maxMeanWordCount, verbose);
    
    this.minIdLength = minIdLength;
    this.maxMeanWordCount = maxMeanWordCount;
    this.verbose = verbose;
    this.verboseDocuments = this.normalizeVerboseDocuments(verboseDocuments);
    this.currentDocumentIndex = null;
    this.wordCountManager = new WordCountManager(new Set(), this.log.bind(this));
    this.wordSelectionStrategy = new WordSelectionStrategy(this.minIdLength, this.maxMeanWordCount, this.wordCountManager, this.log.bind(this));
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





  private generateId(document: string, documentIndex: number): string {
    this.currentDocumentIndex = documentIndex;
    
    // Early termination for empty or whitespace-only documents
    if (!document || document.trim().length === 0) {
      this.log(`Document ${documentIndex} is empty, using fallback ID`);
      return `document_${documentIndex}`;
    }
    
    this.log(`\n=== GENERATING ID FOR DOCUMENT ${documentIndex} ===`);
    this.log(`Document: "${document}"`);
    
    const wordPairs = this.wordCountManager.getPreprocessingService().preprocessText(document, true);
    if (wordPairs.length === 0) {
      return `document_${documentIndex}`;
    }
    
    const { idWords } = this.wordSelectionStrategy.selectWordsForId(wordPairs);
    
    if (idWords.length === 0) {
      return `document_${documentIndex}`;
    }
    
    const finalId = idWords.map(w => w.word).join('_');
    this.log(`Final ID: "${finalId}"`);
    return finalId;
  }

  cacheDocWordCounts(filePath: string): void {
    this.wordCountManager.cacheDocWordCounts(filePath);
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
        this.wordCountManager.loadDocWordCounts(docWordCountPath);
      } else {
        this.wordCountManager.buildDocWordCounts(documents);
      }
    } catch (error) {
      console.warn(`Warning: ${(error as Error).message}. Falling back to building word counts from documents.`);
      this.wordCountManager.buildDocWordCounts(documents);
    }
    
    // Calculate mean word count from corpus and use it if maxMeanWordCount wasn't set
    const { corpusMeanWordCount } = this.wordCountManager.calculateCorpusStats();
    if (corpusMeanWordCount > 0) {
      if (this.maxMeanWordCount === null) {
        this.maxMeanWordCount = corpusMeanWordCount;
        console.log(`Using corpus mean word count: ${corpusMeanWordCount}`);
      } else {
        console.log(`Corpus mean word count: ${corpusMeanWordCount.toFixed(2)}, using maxMeanWordCount: ${this.maxMeanWordCount}`);
      }
    }
    
    // Update strategy with the potentially new maxMeanWordCount only if it changed
    const currentMaxMeanWordCount = this.wordSelectionStrategy ? (this.wordSelectionStrategy as any).maxMeanWordCount : null;
    if (currentMaxMeanWordCount !== this.maxMeanWordCount) {
      this.wordSelectionStrategy = new WordSelectionStrategy(this.minIdLength, this.maxMeanWordCount, this.wordCountManager, this.log.bind(this));
    }
    
    const ids: string[] = [];
    const usedIds = new Set<string>();
    
    for (let i = 0; i < documents.length; i++) {
      // Skip processing for obviously invalid documents early
      if (typeof documents[i] !== 'string') {
        this.log(`Document ${i} is not a string, using fallback ID`);
        let id = `document_${i}`;
        let counter = 1;
        let originalId = id;
        while (usedIds.has(id)) {
          counter++;
          id = `${originalId}_${counter}`;
        }
        usedIds.add(id);
        ids.push(id);
        continue;
      }
      
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