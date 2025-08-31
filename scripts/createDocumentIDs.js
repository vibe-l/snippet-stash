#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

class DocumentIDGenerator {
  constructor(minIdLength = 30, maxIdLength = 50, verbose = false, verboseDocuments = null) {
    this.minIdLength = minIdLength;
    this.maxIdLength = maxIdLength;
    this.docWordCounts = new Map();
    this.usedSortedIds = new Set();
    this.verbose = verbose;
    this.verboseDocuments = verboseDocuments; // Set of document indices to debug
    this.currentDocumentIndex = null; // Track which document we're currently processing
  }

  log(...args) {
    if (this.verbose) {
      // If verboseDocuments is specified, only log for those document indices
      if (this.verboseDocuments && this.currentDocumentIndex !== null) {
        if (this.verboseDocuments.has(this.currentDocumentIndex)) {
          console.log(...args);
        }
      } else if (!this.verboseDocuments) {
        // If no specific documents specified, log everything (original behavior)
        console.log(...args);
      }
    }
  }

  preprocessText(text) {
    this.log(`\n=== PREPROCESSING TEXT: "${text}" ===`);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length >= 3 && !/\d/.test(word));
    this.log(`Preprocessed words:`, words);
    return words;
  }

  buildDocWordCounts(documents) {
    this.log('\n=== BUILDING WORD COUNTS ===');
    const wordCounts = new Map();
    
    for (const doc of documents) {
      const words = this.preprocessText(doc);
      const uniqueWordsInDoc = new Set(words);
      
      for (const word of uniqueWordsInDoc) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    this.docWordCounts = wordCounts;
    this.log('Word counts built:', Array.from(this.docWordCounts.entries()));
  }

  loadDocWordCounts(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(1); // Skip header
        
        for (const line of lines) {
          if (line.trim()) {
            const [word, count] = line.split(',');
            const countNum = parseInt(count);
            this.docWordCounts.set(word, countNum);
          }
        }
      }
    } catch (error) {
      console.error(`Warning: Could not load doc word counts from ${filePath}: ${error.message}`);
    }
  }



  calculateWordScore(word, docPosition, countWeight) {
    const wordCount = this.docWordCounts.get(word) || 0;
    const score = docPosition + countWeight * wordCount;
    this.log(`  "${word}": position=${docPosition}, count=${wordCount}, weight=${countWeight}, score=${score}`);
    return score;
  }

  generateId(document, documentIndex) {
    this.currentDocumentIndex = documentIndex;
    this.log(`\n=== GENERATING ID FOR DOCUMENT ${documentIndex} ===`);
    this.log(`Document: "${document}"`);
    
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
    
    this.log('Unique words with positions:', uniqueWords);
    
    const selectedWords = [];
    const usedWords = new Set();
    const countWeights = [1, 1, 2, 2, 3, 3];
    let currentLength = 0;
    
    // Select words iteratively with different countWeights
    for (let iteration = 0; iteration < countWeights.length && selectedWords.length < uniqueWords.length; iteration++) {
      const countWeight = countWeights[iteration];
      this.log(`\n--- ITERATION ${iteration}, countWeight=${countWeight} ---`);
      
      let bestWord = null;
      let bestScore = Infinity;
      
      // Find the word with the lowest score for this countWeight
      for (const wordObj of uniqueWords) {
        if (usedWords.has(wordObj.word)) {
          this.log(`  "${wordObj.word}": SKIPPED (already used)`);
          continue;
        }
        
        const score = this.calculateWordScore(wordObj.word, wordObj.docPosition, countWeight);
        if (score < bestScore) {
          bestScore = score;
          bestWord = wordObj;
          this.log(`    NEW BEST: "${wordObj.word}" with score ${score}`);
        }
      }
      
      this.log(`Best word for iteration ${iteration}: "${bestWord?.word}" (score: ${bestScore})`);
      
      if (bestWord) {
        const newLength = currentLength + (selectedWords.length > 0 ? 1 : 0) + bestWord.word.length;
        this.log(`Length check: current=${currentLength}, adding="${bestWord.word}" (${bestWord.word.length}), new total=${newLength}, max=${this.maxIdLength}`);
        
        if (newLength <= this.maxIdLength) {
          selectedWords.push(bestWord);
          usedWords.add(bestWord.word);
          currentLength = newLength;
          this.log(`SELECTED: "${bestWord.word}"`);
          this.log(`Selected words so far:`, selectedWords.map(w => w.word));
        } else if (newLength > this.maxIdLength && currentLength >= this.minIdLength) {
          this.log(`STOPPED: Would exceed maxLength (${this.maxIdLength}) but already meet minLength (${this.minIdLength})`);
          break;
        }
      }
    }
    
    // If we don't have enough length, add more words with the last countWeight
    if (currentLength < this.minIdLength && selectedWords.length < uniqueWords.length) {
      const lastCountWeight = countWeights[countWeights.length - 1];
      this.log(`\n--- ENSURING MINIMUM LENGTH (${this.minIdLength}) ---`);
      
      while (currentLength < this.minIdLength && selectedWords.length < uniqueWords.length) {
        let bestWord = null;
        let bestScore = Infinity;
        
        for (const wordObj of uniqueWords) {
          if (usedWords.has(wordObj.word)) continue;
          
          const score = this.calculateWordScore(wordObj.word, wordObj.docPosition, lastCountWeight);
          if (score < bestScore) {
            bestScore = score;
            bestWord = wordObj;
          }
        }
        
        if (bestWord) {
          const newLength = currentLength + (selectedWords.length > 0 ? 1 : 0) + bestWord.word.length;
          this.log(`Adding for min length: "${bestWord.word}" (${bestWord.word.length}), new total=${newLength}`);
          
          // Always add the word if we haven't reached minLength, even if it exceeds maxLength
          if (currentLength < this.minIdLength) {
            selectedWords.push(bestWord);
            usedWords.add(bestWord.word);
            currentLength = newLength;
            this.log(`SELECTED: "${bestWord.word}"`);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
    
    this.log(`\n=== FINAL SELECTION ===`);
    this.log(`Selected words:`, selectedWords.map(w => w.word));
    
    if (selectedWords.length === 0) {
      return `document_${documentIndex}`;
    }
    
    // Return words in document order
    const finalId = selectedWords
      .sort((a, b) => a.docPosition - b.docPosition)
      .map(w => w.word)
      .join('_');
      
    this.log(`Final ID: "${finalId}"`);
    return finalId;
  }



  cacheDocWordCounts(filePath) {
    try {
      const sortedCounts = Array.from(this.docWordCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const csvContent = 'word,count\n' + 
        sortedCounts.map(([word, count]) => `${word},${count}`).join('\n');
      
      fs.writeFileSync(filePath, csvContent, 'utf8');
    } catch (error) {
      console.error(`Warning: Could not cache doc word counts to ${filePath}: ${error.message}`);
    }
  }


  generateIds(documents, docWordCountPath = null) {
    // Load existing data from cache files if available
    if (docWordCountPath && fs.existsSync(docWordCountPath)) {
      this.loadDocWordCounts(docWordCountPath);
    } else {
      this.buildDocWordCounts(documents);
    }
    
    const ids = [];
    const usedIds = new Set();
    
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

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node createDocumentIDs.js <json_file_path> [minIdLength] [maxIdLength] [--verbose|-v [doc_numbers]]');
    console.error('Example: node createDocumentIDs.js documents.json 30 50 --verbose');
    console.error('Example: node createDocumentIDs.js documents.json 30 50 -v 241');
    console.error('Example: node createDocumentIDs.js documents.json 30 50 -v 0,2,5');
    console.error('Options:');
    console.error('  --verbose, -v [doc_numbers]    Enable verbose debug output');
    console.error('                                 Optionally specify comma-separated document indices (0-based)');
    process.exit(1);
  }
  
  // Parse arguments
  let jsonFilePath = args[0];
  let minIdLength = 30;
  let maxIdLength = 50;
  let verbose = false;
  let verboseDocuments = null;
  
  // Process arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--verbose' || arg === '-v') {
      verbose = true;
      // Check if next argument is document numbers (single number or comma-separated)
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        const nextArg = args[i + 1];
        // Check if it's a number or comma-separated numbers
        if (/^[\d,\s]+$/.test(nextArg)) {
          const docNumbers = nextArg.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
          if (docNumbers.length > 0) {
            verboseDocuments = new Set(docNumbers);
            i++; // Skip the next argument since we consumed it
          }
        }
      }
    } else if (i === 1 && !isNaN(parseInt(arg))) {
      minIdLength = parseInt(arg);
    } else if (i === 2 && !isNaN(parseInt(arg))) {
      maxIdLength = parseInt(arg);
    }
  }
  
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Error: File ${jsonFilePath} does not exist`);
    process.exit(1);
  }
  
  try {
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const documents = JSON.parse(jsonContent);
    
    if (!Array.isArray(documents)) {
      console.error('Error: JSON file must contain an array of strings');
      process.exit(1);
    }
    
    if (!documents.every(doc => typeof doc === 'string')) {
      console.error('Error: All elements in the array must be strings');
      process.exit(1);
    }
    
    const docWordCountPath = jsonFilePath.replace(/\.json$/i, '_doc_word_count.csv');
    
    const generator = new DocumentIDGenerator(minIdLength, maxIdLength, verbose, verboseDocuments);
    const ids = generator.generateIds(documents, docWordCountPath);
    
    // Cache the word count data
    generator.cacheDocWordCounts(docWordCountPath);
    
    const results = documents.map((doc, index) => ({
      id: ids[index],
      document: doc
    }));
    
    const outputPath = jsonFilePath.replace(/\.json$/i, '_IDs.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Generated IDs written to: ${outputPath}`);
    console.log(`Document word counts cached to: ${docWordCountPath}`);
    
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DocumentIDGenerator };