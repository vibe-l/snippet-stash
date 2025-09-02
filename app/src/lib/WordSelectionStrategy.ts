import { WordPair } from './TextPreprocessingService.js';
import { WordCountManager } from './WordCountManager.js';

export interface WordData {
  word: string;
  lemmatized: string;
  wordCount: number;
  position: number;
}

export interface WordSelectionResult {
  idWords: WordData[];
  removedWords: WordData[];
}

export class WordSelectionStrategy {
  constructor(
    private minIdLength: number,
    private maxMeanWordCount: number | null,
    private wordCountManager: WordCountManager,
    private log: (...args: any[]) => void
  ) {}

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
    const wordCount = this.wordCountManager.getDocWordCounts().get(lemmatized) || 0;
    
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

  selectWordsForId(wordPairs: WordPair[]): WordSelectionResult {
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
}