#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

class DocumentIDGenerator {
  constructor(minLength = 30, maxLength = 50) {
    this.minLength = minLength;
    this.maxLength = maxLength;
    this.wordFrequencies = new Map();
    this.usedIds = new Set();
  }

  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 0);
  }

  buildWordFrequencies(documents) {
    const totalWords = new Map();
    let documentCount = 0;

    for (const doc of documents) {
      const words = this.preprocessText(doc);
      const uniqueWordsInDoc = new Set(words);
      
      for (const word of uniqueWordsInDoc) {
        totalWords.set(word, (totalWords.get(word) || 0) + 1);
      }
      documentCount++;
    }

    for (const [word, count] of totalWords) {
      this.wordFrequencies.set(word, count / documentCount);
    }
  }

  generateCandidateSequences(words) {
    const candidates = [];
    
    for (let i = 0; i < words.length; i++) {
      let sequence = [];
      let currentLength = 0;
      
      for (let j = i; j < words.length; j++) {
        const word = words[j];
        const newLength = currentLength + (sequence.length > 0 ? 1 : 0) + word.length;
        
        if (newLength > this.maxLength) {
          break;
        }
        
        sequence.push(word);
        currentLength = newLength;
        
        if (currentLength >= this.minLength && currentLength <= this.maxLength) {
          candidates.push({
            words: [...sequence],
            startIndex: i,
            score: this.calculateFrequencyScore(sequence)
          });
        }
      }
    }
    
    return candidates.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.startIndex - b.startIndex;
    });
  }

  calculateFrequencyScore(words) {
    const sum = words.reduce((acc, word) => {
      return acc + (this.wordFrequencies.get(word) || 0);
    }, 0);
    return sum / words.length;
  }

  formatId(words) {
    return words.join('_');
  }

  expandCandidates(candidates, allWords) {
    const newCandidates = [];
    
    for (const candidate of candidates) {
      const { words, startIndex } = candidate;
      const mostFrequentWord = words.reduce((max, word) => {
        const freq = this.wordFrequencies.get(word) || 0;
        const maxFreq = this.wordFrequencies.get(max) || 0;
        return freq > maxFreq ? word : max;
      });
      
      const filteredWords = words.filter(w => w !== mostFrequentWord);
      const originalStartInAllWords = allWords.indexOf(words[0], startIndex);
      const originalEndInAllWords = originalStartInAllWords + words.length - 1;
      
      const expandedSequences = this.expandSequence(
        filteredWords, 
        allWords, 
        originalStartInAllWords, 
        originalEndInAllWords
      );
      
      for (const expanded of expandedSequences) {
        newCandidates.push({
          words: expanded,
          startIndex: originalStartInAllWords,
          score: this.calculateFrequencyScore(expanded)
        });
      }
    }
    
    return newCandidates.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.startIndex - b.startIndex;
    });
  }

  expandSequence(words, allWords, originalStart, originalEnd) {
    const results = [];
    let sequence = [...words];
    let leftIndex = originalStart - 1;
    let rightIndex = originalEnd + 1;
    let addToLeft = true;
    
    while (sequence.length > 0) {
      const currentLength = this.formatId(sequence).length;
      
      if (currentLength >= this.minLength && currentLength <= this.maxLength) {
        results.push([...sequence]);
      }
      
      if (currentLength >= this.maxLength) {
        break;
      }
      
      let wordAdded = false;
      
      if (addToLeft && leftIndex >= 0) {
        const word = allWords[leftIndex];
        const newLength = currentLength + 1 + word.length;
        if (newLength <= this.maxLength) {
          sequence.unshift(word);
          leftIndex--;
          wordAdded = true;
        }
      }
      
      if (!wordAdded && rightIndex < allWords.length) {
        const word = allWords[rightIndex];
        const newLength = currentLength + 1 + word.length;
        if (newLength <= this.maxLength) {
          sequence.push(word);
          rightIndex++;
          wordAdded = true;
        }
      }
      
      if (!wordAdded) {
        break;
      }
      
      addToLeft = !addToLeft;
    }
    
    return results;
  }

  generateId(document, documentIndex) {
    const words = this.preprocessText(document);
    if (words.length === 0) {
      return `document_${documentIndex}`;
    }
    
    let candidates = this.generateCandidateSequences(words);
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      for (const candidate of candidates) {
        const id = this.formatId(candidate.words);
        if (!this.usedIds.has(id)) {
          this.usedIds.add(id);
          return id;
        }
      }
      
      candidates = this.expandCandidates(candidates, words);
      if (candidates.length === 0) {
        break;
      }
      attempts++;
    }
    
    let baseId = words.slice(0, 3).join('_');
    let counter = 1;
    let finalId = baseId;
    
    while (this.usedIds.has(finalId)) {
      finalId = `${baseId}_${counter}`;
      counter++;
    }
    
    this.usedIds.add(finalId);
    return finalId;
  }

  generateIds(documents) {
    this.buildWordFrequencies(documents);
    const ids = [];
    
    for (let i = 0; i < documents.length; i++) {
      const id = this.generateId(documents[i], i);
      ids.push(id);
    }
    
    return ids;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node createDocumentIDs.js <json_file_path> [minLength] [maxLength]');
    console.error('Example: node createDocumentIDs.js documents.json 30 50');
    process.exit(1);
  }
  
  const jsonFilePath = args[0];
  const minLength = args[1] ? parseInt(args[1]) : 30;
  const maxLength = args[2] ? parseInt(args[2]) : 50;
  
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
    
    const generator = new DocumentIDGenerator(minLength, maxLength);
    const ids = generator.generateIds(documents);
    
    const results = documents.map((doc, index) => ({
      id: ids[index],
      document: doc
    }));
    
    const outputPath = jsonFilePath.replace(/\.json$/i, '_IDs.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Generated IDs written to: ${outputPath}`);
    
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DocumentIDGenerator };