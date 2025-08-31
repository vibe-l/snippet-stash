#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

class DocumentIDGenerator {
  constructor(minIdLength = 30, maxIdLength = 50) {
    this.minIdLength = minIdLength;
    this.maxIdLength = maxIdLength;
    this.docWordCounts = new Map();
    this.idWordCounts = new Map();
    this.referenceCount = 0;
    this.usedSortedIds = new Set();
  }

  preprocessText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length >= 3 && !/\d/.test(word));
  }

  calculatePositionWeight(position) {
    if (position >= 300) return 0;
    if (position === 0) return 1;
    return Math.max(0, 1 - (position / 300));
  }

  buildDocWordCounts(documents) {
    const wordCounts = new Map();
    
    for (const doc of documents) {
      const words = this.preprocessText(doc);
      const processedWords = new Map();
      
      // Calculate weighted count for each word based on its first occurrence position
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (!processedWords.has(word)) {
          const weight = this.calculatePositionWeight(i);
          processedWords.set(word, weight);
        }
      }
      
      // Add weighted counts to global word counts
      for (const [word, weight] of processedWords) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + weight);
      }
    }
    
    this.docWordCounts = wordCounts;
    
    // Calculate 25th percentile of highest word count (75th percentile overall)
    const counts = Array.from(wordCounts.values()).sort((a, b) => b - a);
    const percentile25Index = Math.floor(counts.length * 0.25);
    this.referenceCount = counts[percentile25Index] || 0;
  }

  loadDocWordCounts(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(1); // Skip header
        
        const counts = [];
        for (const line of lines) {
          if (line.trim()) {
            const [word, count] = line.split(',');
            const countNum = parseFloat(count);
            this.docWordCounts.set(word, countNum);
            counts.push(countNum);
          }
        }
        
        // Calculate 25th percentile of highest word count (75th percentile overall)
        counts.sort((a, b) => b - a);
        const percentile25Index = Math.floor(counts.length * 0.25);
        this.referenceCount = counts[percentile25Index] || 0;
      }
    } catch (error) {
      console.error(`Warning: Could not load doc word counts from ${filePath}: ${error.message}`);
    }
  }

  loadIdWordCounts(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(1); // Skip header
        
        for (const line of lines) {
          if (line.trim()) {
            const [word, count] = line.split(',');
            this.idWordCounts.set(word, parseInt(count));
          }
        }
      }
    } catch (error) {
      console.error(`Warning: Could not load ID word counts from ${filePath}: ${error.message}`);
    }
  }

  loadExistingSortedIds(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const sortedIds = content.split('\n').filter(line => line.trim().length > 0);
        sortedIds.forEach(id => this.usedSortedIds.add(id));
      }
    } catch (error) {
      console.error(`Warning: Could not load existing sorted IDs from ${filePath}: ${error.message}`);
    }
  }

  calculateWordScore(word) {
    const docWordCount = this.docWordCounts.get(word) || 0;
    const idWordCount = this.idWordCounts.get(word) || 0;
    
    if (docWordCount === this.referenceCount) {
      return 2 * idWordCount;
    } else if (docWordCount < this.referenceCount) {
      return this.referenceCount - docWordCount + 2 * idWordCount;
    } else {
      return docWordCount - this.referenceCount + 2 * idWordCount;
    }
  }

  generateId(document, documentIndex, sortedIdsFilePath) {
    const words = this.preprocessText(document);
    if (words.length === 0) {
      return `document_${documentIndex}`;
    }
    
    // Remove duplicate words while preserving order
    const uniqueWords = [];
    const seenWords = new Set();
    for (let i = 0; i < words.length; i++) {
      if (!seenWords.has(words[i])) {
        seenWords.add(words[i]);
        uniqueWords.push(words[i]);
      }
    }
    
    // Create word objects with document index and score
    const wordObjects = uniqueWords.map((word, index) => ({
      word,
      docIndex: index,
      score: this.calculateWordScore(word)
    }));
    
    // Sort by ascending score
    const sortedWords = wordObjects.sort((a, b) => a.score - b.score);
    
    let currentSet = [];
    let currentLength = 0;
    let wordIndex = 0;
    
    while (wordIndex < sortedWords.length) {
      const wordObj = sortedWords[wordIndex];
      const newLength = currentLength + (currentSet.length > 0 ? 1 : 0) + wordObj.word.length;
      
      if (newLength > this.maxIdLength) {
        if (currentLength >= this.minIdLength) {
          break;
        }
        // If we haven't reached minLength, we need to try different combination
        if (currentSet.length > 0) {
          // Remove the last added word and try next
          const removed = currentSet.pop();
          currentLength = this.calculateIdLength(currentSet);
          wordIndex++;
          continue;
        } else {
          wordIndex++;
          continue;
        }
      }
      
      currentSet.push(wordObj);
      currentLength = newLength;
      
      if (currentLength >= this.minIdLength) {
        // Check uniqueness
        const sortedId = currentSet
          .map(w => w.word)
          .sort()
          .join('_');
          
        if (!this.usedSortedIds.has(sortedId)) {
          this.usedSortedIds.add(sortedId);
          
          // Update ID word counts
          const uniqueWords = new Set(currentSet.map(w => w.word));
          for (const word of uniqueWords) {
            this.idWordCounts.set(word, (this.idWordCounts.get(word) || 0) + 1);
          }
          
          // Cache the sorted ID
          if (sortedIdsFilePath) {
            this.cacheSortedId(sortedIdsFilePath, sortedId);
          }
          
          // Return words in document order
          const finalId = currentSet
            .sort((a, b) => a.docIndex - b.docIndex)
            .map(w => w.word)
            .join('_');
            
          return finalId;
        } else {
          // ID already exists, remove lowest scoring word and add next
          if (currentSet.length > 1) {
            currentSet.shift(); // Remove first (lowest score)
            currentLength = this.calculateIdLength(currentSet);
          }
        }
      }
      
      wordIndex++;
    }
    
    // Fallback if no unique ID found
    const fallbackWords = words.slice(0, Math.min(3, words.length));
    let baseId = fallbackWords.join('_');
    let counter = 1;
    let finalId = baseId;
    
    const sortedFallback = fallbackWords.sort().join('_');
    while (this.usedSortedIds.has(sortedFallback + (counter > 1 ? `_${counter}` : ''))) {
      counter++;
    }
    
    if (counter > 1) {
      finalId = `${baseId}_${counter}`;
    }
    
    this.usedSortedIds.add(sortedFallback + (counter > 1 ? `_${counter}` : ''));
    return finalId;
  }

  calculateIdLength(wordObjects) {
    if (wordObjects.length === 0) return 0;
    return wordObjects.reduce((acc, w, i) => acc + w.word.length + (i > 0 ? 1 : 0), 0);
  }

  cacheSortedId(filePath, sortedId) {
    try {
      fs.appendFileSync(filePath, sortedId + '\n', 'utf8');
    } catch (error) {
      console.error(`Warning: Could not cache sorted ID to ${filePath}: ${error.message}`);
    }
  }

  cacheDocWordCounts(filePath) {
    try {
      const sortedCounts = Array.from(this.docWordCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const csvContent = 'word,count\n' + 
        sortedCounts.map(([word, count]) => `${word},${count.toFixed(6)}`).join('\n');
      
      fs.writeFileSync(filePath, csvContent, 'utf8');
    } catch (error) {
      console.error(`Warning: Could not cache doc word counts to ${filePath}: ${error.message}`);
    }
  }

  cacheIdWordCounts(filePath) {
    try {
      const sortedCounts = Array.from(this.idWordCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const csvContent = 'word,count\n' + 
        sortedCounts.map(([word, count]) => `${word},${count}`).join('\n');
      
      fs.writeFileSync(filePath, csvContent, 'utf8');
    } catch (error) {
      console.error(`Warning: Could not cache ID word counts to ${filePath}: ${error.message}`);
    }
  }

  generateIds(documents, docWordCountPath = null, idWordCountPath = null, sortedIdsPath = null) {
    // Load existing data from cache files if available
    if (docWordCountPath && fs.existsSync(docWordCountPath)) {
      this.loadDocWordCounts(docWordCountPath);
    } else {
      this.buildDocWordCounts(documents);
    }
    
    if (idWordCountPath) {
      this.loadIdWordCounts(idWordCountPath);
    }
    
    if (sortedIdsPath) {
      this.loadExistingSortedIds(sortedIdsPath);
    }
    
    const ids = [];
    
    for (let i = 0; i < documents.length; i++) {
      const id = this.generateId(documents[i], i, sortedIdsPath);
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
    const idWordCountPath = jsonFilePath.replace(/\.json$/i, '_id_word_count.csv');
    const sortedIdsPath = jsonFilePath.replace(/\.json$/i, '_ID_sorted_word.txt');
    
    const generator = new DocumentIDGenerator(minIdLength, maxIdLength);
    const ids = generator.generateIds(documents, docWordCountPath, idWordCountPath, sortedIdsPath);
    
    // Cache the word count data
    generator.cacheDocWordCounts(docWordCountPath);
    generator.cacheIdWordCounts(idWordCountPath);
    
    const results = documents.map((doc, index) => ({
      id: ids[index],
      document: doc
    }));
    
    const outputPath = jsonFilePath.replace(/\.json$/i, '_IDs.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Generated IDs written to: ${outputPath}`);
    console.log(`Document word counts cached to: ${docWordCountPath}`);
    console.log(`ID word counts cached to: ${idWordCountPath}`);
    console.log(`Sorted IDs cached to: ${sortedIdsPath}`);
    
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DocumentIDGenerator };