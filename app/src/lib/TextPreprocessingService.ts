import { IRREGULAR_MAPPINGS, SUFFIXES } from '../config/lemmatization.ts';
import { DEFAULT_CONFIG, STOPWORDS, TEXT_PROCESSING } from '../config/constants.ts';

export interface WordPair {
  original: string;
  lemmatized: string;
}

export class TextPreprocessingService {
  private vocabulary: Set<string>;
  private logger: (message: string, ...args: any[]) => void;

  constructor(vocabulary: Set<string>, logger: (message: string, ...args: any[]) => void = () => {}) {
    this.vocabulary = vocabulary;
    this.logger = logger;
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
      this.logger(`  Irregular lemmatized "${word}" → "${IRREGULAR_MAPPINGS[word]}"`);
      return IRREGULAR_MAPPINGS[word];
    }
    
    // Try removing each suffix and check if resulting lemma exists in vocabulary
    for (const suffix of SUFFIXES) {
      if (word.endsWith(suffix) && word.length > suffix.length + DEFAULT_CONFIG.MIN_LEMMA_LENGTH - 1) {
        const lemma = word.slice(0, -suffix.length);
        if (this.vocabulary.has(lemma)) {
          this.logger(`  Suffix lemmatized "${word}" → "${lemma}"`);
          return lemma;
        }
      }
    }
    
    // Special case for -ies → -y
    if (word.endsWith('ies') && word.length > 5) {
      const lemma = word.slice(0, -3) + 'y';
      if (this.vocabulary.has(lemma)) {
        this.logger(`  Special lemmatized "${word}" → "${lemma}"`);
        return lemma;
      }
    }
    
    return word; // Return original if no valid lemma found
  }

  private extractWords(text: string): { originalWords: string[]; validWords: string[]; validOriginalWords: string[] } {
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
      
      if (lowerWord.length >= DEFAULT_CONFIG.MIN_WORD_LENGTH && 
          !TEXT_PROCESSING.NUMBER_REGEX.test(lowerWord) && 
          !STOPWORDS.has(lowerWord) && 
          !this.shouldSkip2LetterWord(originalWord)) {
        validWords.push(lowerWord);
        validOriginalWords.push(originalWord);
      }
    }

    return { originalWords, validWords, validOriginalWords };
  }

  preprocessText(text: string): string[];
  preprocessText(text: string, returnOriginals: true): WordPair[];
  preprocessText(text: string, returnOriginals: boolean = false): string[] | WordPair[] {
    this.logger(`\n=== PREPROCESSING TEXT: "${text}" ===`);
    
    const { validWords, validOriginalWords } = this.extractWords(text);
    
    if (returnOriginals) {
      // Return array of objects with original case and lemmatized versions
      const wordPairs: WordPair[] = validWords.map((word, index) => ({
        original: validOriginalWords[index], // Keep original case
        lemmatized: this.vocabulary.size > 0 ? this.lemmatizeWord(word) : word
      }));
      this.logger(`Preprocessed word pairs:`, wordPairs);
      return wordPairs;
    } else {
      // Apply lemmatization if vocabulary is available (for word count building)
      const processedWords = this.vocabulary.size > 0 
        ? validWords.map(word => this.lemmatizeWord(word))
        : validWords;
      
      this.logger(`Preprocessed words:`, processedWords);
      return processedWords;
    }
  }

  buildVocabularyFromDocuments(documents: string[]): Set<string> {
    const vocabulary = new Set<string>();
    
    for (const doc of documents) {
      const { validWords } = this.extractWords(doc);
      for (const word of validWords) {
        vocabulary.add(word);
      }
    }
    
    this.logger(`Vocabulary built with ${vocabulary.size} unique words`);
    return vocabulary;
  }
}