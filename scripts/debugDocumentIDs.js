#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

class DebugDocumentIDGenerator {
  constructor(minIdLength = 30, maxIdLength = 50) {
    this.minIdLength = minIdLength;
    this.maxIdLength = maxIdLength;
    this.docWordCounts = new Map();
    this.idWordCounts = new Map();
    this.usedSortedIds = new Set();
  }

  preprocessText(text) {
    console.log(`\n=== PREPROCESSING TEXT: "${text}" ===`);
    const words = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length >= 3 && !/\d/.test(word));
    
    console.log(`Preprocessed words:`, words);
    return words;
  }

  buildDocWordCounts(documents) {
    console.log('\n=== BUILDING WORD COUNTS ===');
    const wordCounts = new Map();
    
    for (const doc of documents) {
      const words = this.preprocessText(doc);
      const uniqueWordsInDoc = new Set(words);
      
      for (const word of uniqueWordsInDoc) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    this.docWordCounts = wordCounts;
    console.log('Word counts built:', Array.from(wordCounts.entries()));
  }

  calculateWordScore(word, docPosition, countWeight) {
    const wordCount = this.docWordCounts.get(word) || 0;
    const score = docPosition + countWeight * wordCount;
    console.log(`  "${word}": position=${docPosition}, count=${wordCount}, weight=${countWeight}, score=${score}`);
    return score;
  }

  generateId(document, documentIndex, sortedIdsFilePath) {
    console.log(`\n=== GENERATING ID FOR DOCUMENT ${documentIndex} ===`);
    console.log(`Document: "${document}"`);
    
    const words = this.preprocessText(document);
    if (words.length === 0) {
      return `document_${documentIndex}`;
    }
    
    // Remove duplicate words while preserving order and position
    const uniqueWords = [];
    const seenWords = new Set();
    for (let i = 0; i < words.length; i++) {
      if (!seenWords.has(words[i])) {
        seenWords.add(words[i]);
        uniqueWords.push({ word: words[i], docPosition: i });
      }
    }
    
    console.log('Unique words with positions:', uniqueWords);
    
    const selectedWords = [];
    const usedWords = new Set();
    const countWeights = [3, 4, 5, 6, 7];
    let currentLength = 0;
    
    // Select words iteratively with different countWeights
    for (let iteration = 0; iteration < countWeights.length && selectedWords.length < uniqueWords.length; iteration++) {
      const countWeight = countWeights[iteration];
      console.log(`\n--- ITERATION ${iteration}, countWeight=${countWeight} ---`);
      
      let bestWord = null;
      let bestScore = Infinity;
      
      // Find the word with the lowest score for this countWeight
      for (const wordObj of uniqueWords) {
        if (usedWords.has(wordObj.word)) {
          console.log(`  "${wordObj.word}": SKIPPED (already used)`);
          continue;
        }
        
        const score = this.calculateWordScore(wordObj.word, wordObj.docPosition, countWeight);
        if (score < bestScore) {
          bestScore = score;
          bestWord = wordObj;
          console.log(`    NEW BEST: "${wordObj.word}" with score ${score}`);
        }
      }
      
      console.log(`Best word for iteration ${iteration}: "${bestWord?.word}" (score: ${bestScore})`);
      
      if (bestWord) {
        const newLength = currentLength + (selectedWords.length > 0 ? 1 : 0) + bestWord.word.length;
        console.log(`Length check: current=${currentLength}, adding="${bestWord.word}" (${bestWord.word.length}), new total=${newLength}, max=${this.maxIdLength}`);
        
        if (newLength <= this.maxIdLength) {
          selectedWords.push(bestWord);
          usedWords.add(bestWord.word);
          currentLength = newLength;
          console.log(`SELECTED: "${bestWord.word}"`);
          console.log(`Selected words so far:`, selectedWords.map(w => w.word));
        } else if (newLength > this.maxIdLength && currentLength >= this.minIdLength) {
          console.log(`STOPPED: Would exceed maxLength (${this.maxIdLength}) but already meet minLength (${this.minIdLength})`);
          break;
        }
      }
    }
    
    console.log(`\n=== FINAL SELECTION ===`);
    console.log(`Selected words:`, selectedWords.map(w => w.word));
    
    if (selectedWords.length === 0) {
      return `document_${documentIndex}`;
    }
    
    // Return words in document order
    const finalId = selectedWords
      .sort((a, b) => a.docPosition - b.docPosition)
      .map(w => w.word)
      .join('_');
      
    console.log(`Final ID: "${finalId}"`);
    return finalId;
  }
}

// Test with your specific document
function testSpecificDocument() {
  const testDocument = "Translate the following from French to English:";
  
  // Mock word counts - you'll need to provide the actual counts from your data
  const mockWordCounts = new Map([
    ['translate', 10],    // Replace with actual count
    ['the', 226],         // Your provided count
    ['following', 15],    // Replace with actual count
    ['from', 50],         // Replace with actual count
    ['french', 8],        // Replace with actual count
    ['english', 6]        // Your provided count
  ]);
  
  const generator = new DebugDocumentIDGenerator(30, 50);
  generator.docWordCounts = mockWordCounts;
  
  const id = generator.generateId(testDocument, 0);
  console.log(`\n=== RESULT ===`);
  console.log(`Generated ID: "${id}"`);
}

testSpecificDocument();