#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

class DocumentIDGenerator {
  constructor(minIdLength = 30, maxIdLength = 50) {
    this.minIdLength = minIdLength;
    this.maxIdLength = maxIdLength;
    this.docWordCounts = new Map();
    this.usedSortedIds = new Set();
  }

  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length >= 3 && !/\d/.test(word));
  }

  buildDocWordCounts(documents) {
    const wordCounts = new Map();
    
    for (const doc of documents) {
      const words = this.preprocessText(doc);
      const uniqueWordsInDoc = new Set(words);
      
      for (const word of uniqueWordsInDoc) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    this.docWordCounts = wordCounts;
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
    return docPosition + countWeight * wordCount;
  }

  generateId(document, documentIndex) {
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
    
    const selectedWords = [];
    const usedWords = new Set();
    const countWeights = [1, 2, 3, 4, 5];
    let currentLength = 0;
    
    // Select words iteratively with different countWeights
    for (let iteration = 0; iteration < countWeights.length && selectedWords.length < uniqueWords.length; iteration++) {
      const countWeight = countWeights[iteration];
      let bestWord = null;
      let bestScore = Infinity;
      
      // Find the word with the lowest score for this countWeight
      for (const wordObj of uniqueWords) {
        if (usedWords.has(wordObj.word)) continue;
        
        const score = this.calculateWordScore(wordObj.word, wordObj.docPosition, countWeight);
        if (score < bestScore) {
          bestScore = score;
          bestWord = wordObj;
        }
      }
      
      if (bestWord) {
        const newLength = currentLength + (selectedWords.length > 0 ? 1 : 0) + bestWord.word.length;
        
        if (newLength <= this.maxIdLength) {
          selectedWords.push(bestWord);
          usedWords.add(bestWord.word);
          currentLength = newLength;
        } else if (newLength > this.maxIdLength && currentLength >= this.minIdLength) {
          // Stop if adding would exceed maxLength but we already meet minLength
          break;
        }
      }
    }
    
    // If we don't have enough length, add more words with the last countWeight
    if (currentLength < this.minIdLength && selectedWords.length < uniqueWords.length) {
      const lastCountWeight = countWeights[countWeights.length - 1];
      
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
          
          // Always add the word if we haven't reached minLength, even if it exceeds maxLength
          if (currentLength < this.minIdLength) {
            selectedWords.push(bestWord);
            usedWords.add(bestWord.word);
            currentLength = newLength;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
    
    if (selectedWords.length === 0) {
      return `document_${documentIndex}`;
    }
    
    // Return words in document order
    const finalId = selectedWords
      .sort((a, b) => a.docPosition - b.docPosition)
      .map(w => w.word)
      .join('_');
      
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
    console.error('Usage: node createDocumentIDs.js <json_file_path> [minIdLength] [maxIdLength]');
    console.error('Example: node createDocumentIDs.js documents.json 30 50');
    process.exit(1);
  }
  
  const jsonFilePath = args[0];
  const minIdLength = args[1] ? parseInt(args[1]) : 30;
  const maxIdLength = args[2] ? parseInt(args[2]) : 50;
  
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
    
    const generator = new DocumentIDGenerator(minIdLength, maxIdLength);
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