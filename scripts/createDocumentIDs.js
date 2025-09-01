#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

class DocumentIDGenerator {
  constructor(minIdLength = 30, maxAverageWordCount = 5, verbose = false, verboseDocuments = null) {
    this.minIdLength = minIdLength;
    this.maxAverageWordCount = maxAverageWordCount;
    this.docWordCounts = new Map();
    this.vocabulary = new Set(); // Set of all unique words from corpus
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

  lemmatizeWord(word) {
    // Irregular verb and noun mappings
    const irregularMappings = {
      // Irregular verbs (present/past/past participle forms)
      'was': 'be', 'were': 'be', 'been': 'be', 'am': 'be', 'is': 'be', 'are': 'be',
      'has': 'have', 'had': 'have', 'having': 'have',
      'does': 'do', 'did': 'do', 'done': 'do', 'doing': 'do',
      'goes': 'go', 'went': 'go', 'gone': 'go', 'going': 'go',
      'gets': 'get', 'got': 'get', 'gotten': 'get', 'getting': 'get',
      'makes': 'make', 'made': 'make', 'making': 'make',
      'takes': 'take', 'took': 'take', 'taken': 'take', 'taking': 'take',
      'comes': 'come', 'came': 'come', 'coming': 'come',
      'gives': 'give', 'gave': 'give', 'given': 'give', 'giving': 'give',
      'says': 'say', 'said': 'say', 'saying': 'say',
      'sees': 'see', 'saw': 'see', 'seen': 'see', 'seeing': 'see',
      'knows': 'know', 'knew': 'know', 'known': 'know', 'knowing': 'know',
      'thinks': 'think', 'thought': 'think', 'thinking': 'think',
      'finds': 'find', 'found': 'find', 'finding': 'find',
      'tells': 'tell', 'told': 'tell', 'telling': 'tell',
      'becomes': 'become', 'became': 'become', 'becoming': 'become',
      'leaves': 'leave', 'left': 'leave', 'leaving': 'leave',
      'feels': 'feel', 'felt': 'feel', 'feeling': 'feel',
      'brings': 'bring', 'brought': 'bring', 'bringing': 'bring',
      'begins': 'begin', 'began': 'begin', 'begun': 'begin', 'beginning': 'begin',
      'keeps': 'keep', 'kept': 'keep', 'keeping': 'keep',
      'holds': 'hold', 'held': 'hold', 'holding': 'hold',
      'writes': 'write', 'wrote': 'write', 'written': 'write', 'writing': 'write',
      'stands': 'stand', 'stood': 'stand', 'standing': 'stand',
      'hears': 'hear', 'heard': 'hear', 'hearing': 'hear',
      'lets': 'let', 'letting': 'let',
      'means': 'mean', 'meant': 'mean', 'meaning': 'mean',
      'sets': 'set', 'setting': 'set',
      'meets': 'meet', 'met': 'meet', 'meeting': 'meet',
      'runs': 'run', 'ran': 'run', 'running': 'run',
      'moves': 'move', 'moved': 'move', 'moving': 'move',
      'lives': 'live', 'lived': 'live', 'living': 'live',
      'believes': 'believe', 'believed': 'believe', 'believing': 'believe',
      'brings': 'bring', 'brought': 'bring', 'bringing': 'bring',
      'builds': 'build', 'built': 'build', 'building': 'build',
      'buys': 'buy', 'bought': 'buy', 'buying': 'buy',
      'catches': 'catch', 'caught': 'catch', 'catching': 'catch',
      'chooses': 'choose', 'chose': 'choose', 'chosen': 'choose', 'choosing': 'choose',
      'cuts': 'cut', 'cutting': 'cut',
      'draws': 'draw', 'drew': 'draw', 'drawn': 'draw', 'drawing': 'draw',
      'drinks': 'drink', 'drank': 'drink', 'drunk': 'drink', 'drinking': 'drink',
      'drives': 'drive', 'drove': 'drive', 'driven': 'drive', 'driving': 'drive',
      'eats': 'eat', 'ate': 'eat', 'eaten': 'eat', 'eating': 'eat',
      'falls': 'fall', 'fell': 'fall', 'fallen': 'fall', 'falling': 'fall',
      'fights': 'fight', 'fought': 'fight', 'fighting': 'fight',
      'flies': 'fly', 'flew': 'fly', 'flown': 'fly', 'flying': 'fly',
      'forgets': 'forget', 'forgot': 'forget', 'forgotten': 'forget', 'forgetting': 'forget',
      'grows': 'grow', 'grew': 'grow', 'grown': 'grow', 'growing': 'grow',
      'hangs': 'hang', 'hung': 'hang', 'hanging': 'hang',
      'hits': 'hit', 'hitting': 'hit',
      'hurts': 'hurt', 'hurting': 'hurt',
      'lays': 'lay', 'laid': 'lay', 'laying': 'lay',
      'leads': 'lead', 'led': 'lead', 'leading': 'lead',
      'learns': 'learn', 'learned': 'learn', 'learnt': 'learn', 'learning': 'learn',
      'lies': 'lie', 'lay': 'lie', 'lain': 'lie', 'lying': 'lie',
      'loses': 'lose', 'lost': 'lose', 'losing': 'lose',
      'pays': 'pay', 'paid': 'pay', 'paying': 'pay',
      'puts': 'put', 'putting': 'put',
      'reads': 'read', 'reading': 'read',
      'rides': 'ride', 'rode': 'ride', 'ridden': 'ride', 'riding': 'ride',
      'rings': 'ring', 'rang': 'ring', 'rung': 'ring', 'ringing': 'ring',
      'rises': 'rise', 'rose': 'rise', 'risen': 'rise', 'rising': 'rise',
      'sells': 'sell', 'sold': 'sell', 'selling': 'sell',
      'sends': 'send', 'sent': 'send', 'sending': 'send',
      'shuts': 'shut', 'shutting': 'shut',
      'sings': 'sing', 'sang': 'sing', 'sung': 'sing', 'singing': 'sing',
      'sits': 'sit', 'sat': 'sit', 'sitting': 'sit',
      'sleeps': 'sleep', 'slept': 'sleep', 'sleeping': 'sleep',
      'speaks': 'speak', 'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak',
      'spends': 'spend', 'spent': 'spend', 'spending': 'spend',
      'swims': 'swim', 'swam': 'swim', 'swum': 'swim', 'swimming': 'swim',
      'teaches': 'teach', 'taught': 'teach', 'teaching': 'teach',
      'throws': 'throw', 'threw': 'throw', 'thrown': 'throw', 'throwing': 'throw',
      'understands': 'understand', 'understood': 'understand', 'understanding': 'understand',
      'wakes': 'wake', 'woke': 'wake', 'woken': 'wake', 'waking': 'wake',
      'wears': 'wear', 'wore': 'wear', 'worn': 'wear', 'wearing': 'wear',
      'wins': 'win', 'won': 'win', 'winning': 'win',
      
      // Irregular plurals and comparative forms
      'children': 'child', 'people': 'person', 'men': 'man', 'women': 'woman',
      'teeth': 'tooth', 'feet': 'foot', 'geese': 'goose', 'mice': 'mouse',
      'better': 'good', 'best': 'good', 'worse': 'bad', 'worst': 'bad',
      'more': 'much', 'most': 'much', 'less': 'little', 'least': 'little',
      'further': 'far', 'furthest': 'far', 'farther': 'far', 'farthest': 'far'
    };
    
    // Check irregular mappings first
    if (irregularMappings[word] && this.vocabulary.has(irregularMappings[word])) {
      this.log(`  Irregular lemmatized "${word}" → "${irregularMappings[word]}"`);
      return irregularMappings[word];
    }
    
    // Common English suffixes to try removing
    const suffixes = [
      'ing', 'ed', 'es', 's', 'er', 'est', 'ly', 'tion', 'sion', 'ment', 
      'ness', 'ity', 'able', 'ible', 'ful', 'less', 'ish', 'ous', 'ive'
    ];
    
    // Try removing each suffix and check if resulting lemma exists in vocabulary
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) { // Ensure lemma would be at least 3 chars
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

  preprocessText(text) {
    this.log(`\n=== PREPROCESSING TEXT: "${text}" ===`);
    const stopwords = new Set(['will', 'was', 'were', 'been', 'are', 'is', 'be', 'am']);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length >= 3 && !/\d/.test(word) && !stopwords.has(word));
    
    // Apply lemmatization if vocabulary is available
    const processedWords = this.vocabulary.size > 0 
      ? words.map(word => this.lemmatizeWord(word))
      : words;
    
    this.log(`Preprocessed words:`, processedWords);
    return processedWords;
  }

  buildDocWordCounts(documents) {
    this.log('\n=== BUILDING WORD COUNTS ===');
    
    // First pass: build vocabulary without lemmatization
    this.log('Building vocabulary...');
    const stopwords = new Set(['was', 'were', 'been', 'are', 'is', 'be', 'am']);
    for (const doc of documents) {
      const words = doc
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(word => word.length >= 3 && !/\d/.test(word) && !stopwords.has(word));
      
      for (const word of words) {
        this.vocabulary.add(word);
      }
    }
    this.log(`Vocabulary built with ${this.vocabulary.size} unique words`);
    
    // Second pass: build word counts with lemmatization
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
            // Also add to vocabulary for lemmatization
            this.vocabulary.add(word);
          }
        }
        this.log(`Loaded ${this.docWordCounts.size} word counts and built vocabulary from cache`);
      }
    } catch (error) {
      console.error(`Warning: Could not load doc word counts from ${filePath}: ${error.message}`);
    }
  }

  generateId(document, documentIndex) {
    this.currentDocumentIndex = documentIndex;
    this.log(`\n=== GENERATING ID FOR DOCUMENT ${documentIndex} ===`);
    this.log(`Document: "${document}"`);
    
    const words = this.preprocessText(document);
    if (words.length === 0) {
      return `document_${documentIndex}`;
    }
    
    const idWords = [];
    const removedWords = [];
    const usedWords = new Set(); // Track words already added to prevent duplicates
    let wordIndex = 0;
    
    this.log('Starting word selection...');
    
    while (wordIndex < words.length) {
      const word = words[wordIndex];
      const wordCount = this.docWordCounts.get(word) || 0;
      
      // Skip if word is already in the ID
      if (usedWords.has(word)) {
        this.log(`Skipped duplicate word "${word}" at position ${wordIndex}`);
        wordIndex++;
        continue;
      }
      
      // Add the word to our ID array with position information
      idWords.push({ word, wordCount, position: wordIndex });
      usedWords.add(word);
      this.log(`Added "${word}" (count: ${wordCount}, position: ${wordIndex}) to ID array`);
      
      // Check if we have enough length
      const currentIdString = idWords.map(w => w.word).join('_');
      const hasMinLength = currentIdString.length >= this.minIdLength;
      
      // Calculate average word count
      const totalWordCount = idWords.reduce((sum, w) => sum + w.wordCount, 0);
      const avgWordCount = totalWordCount / idWords.length;
      const avgBelowThreshold = avgWordCount <= this.maxAverageWordCount;
      
      this.log(`Current ID: "${currentIdString}" (length: ${currentIdString.length})`);
      this.log(`Average word count: ${avgWordCount.toFixed(2)} (threshold: ${this.maxAverageWordCount})`);
      this.log(`Min length met: ${hasMinLength}, Avg below threshold: ${avgBelowThreshold}`);
      
      // If we meet both conditions, we're done
      if (hasMinLength && avgBelowThreshold) {
        this.log('Both conditions met, stopping');
        break;
      }
      
      // If average is too high, remove the word with highest count
      if (!avgBelowThreshold) {
        // Find the word with highest count
        let maxCount = -1;
        let maxIndex = -1;
        for (let i = 0; i < idWords.length; i++) {
          if (idWords[i].wordCount > maxCount) {
            maxCount = idWords[i].wordCount;
            maxIndex = i;
          }
        }
        
        if (maxIndex !== -1) {
          const removedWord = idWords[maxIndex];
          removedWords.push(removedWord);
          idWords.splice(maxIndex, 1);
          usedWords.delete(removedWord.word); // Remove from used words set
          this.log(`Removed "${removedWord.word}" (count: ${removedWord.wordCount}, position: ${removedWord.position}) - highest count`);
        }
      }
      
      wordIndex++;
    }
    
    // After processing all words, check if we need to add words back to meet minimum length
    let currentIdString = idWords.map(w => w.word).join('_');
    if (currentIdString.length < this.minIdLength && removedWords.length > 0) {
      this.log(`\n=== ID LENGTH BELOW MINIMUM (${currentIdString.length} < ${this.minIdLength}) ===`);
      this.log('Attempting to add back removed words...');
      
      // Sort removed words by wordCount (ascending) to add lowest count words first
      removedWords.sort((a, b) => a.wordCount - b.wordCount);
      this.log('Removed words sorted by count:', removedWords.map(w => `${w.word}(${w.wordCount})`));
      
      for (const wordObj of removedWords) {
        // Skip if word is already in the ID (shouldn't happen but safety check)
        if (usedWords.has(wordObj.word)) {
          this.log(`Skipped adding back duplicate word "${wordObj.word}"`);
          continue;
        }
        
        // Find the correct insertion position based on original document position
        let insertIndex = 0;
        for (let i = 0; i < idWords.length; i++) {
          if (idWords[i].position < wordObj.position) {
            insertIndex = i + 1;
          } else {
            break;
          }
        }
        
        // Insert the word at the correct position
        idWords.splice(insertIndex, 0, wordObj);
        usedWords.add(wordObj.word); // Add back to used words set
        this.log(`Added back "${wordObj.word}" (count: ${wordObj.wordCount}) at position ${insertIndex}`);
        
        // Check if we now meet the minimum length requirement
        currentIdString = idWords.map(w => w.word).join('_');
        this.log(`New ID: "${currentIdString}" (length: ${currentIdString.length})`);
        
        if (currentIdString.length >= this.minIdLength) {
          this.log('Minimum length requirement met, stopping');
          break;
        }
      }
    }
    
    if (idWords.length === 0) {
      return `document_${documentIndex}`;
    }
    
    const finalId = idWords.map(w => w.word).join('_');
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
    console.error('Usage: node createDocumentIDs.js <json_file_path> [minIdLength] [maxAverageWordCount] [--verbose|-v [doc_numbers]]');
    console.error('Example: node createDocumentIDs.js documents.json 30 5 --verbose');
    console.error('Example: node createDocumentIDs.js documents.json 30 5 -v 241');
    console.error('Example: node createDocumentIDs.js documents.json 30 5 -v 0,2,5');
    console.error('Options:');
    console.error('  --verbose, -v [doc_numbers]    Enable verbose debug output');
    console.error('                                 Optionally specify comma-separated document indices (0-based)');
    process.exit(1);
  }
  
  // Parse arguments
  let jsonFilePath = args[0];
  let minIdLength = 30;
  let maxAverageWordCount = 5;
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
      maxAverageWordCount = parseInt(arg);
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
    
    const generator = new DocumentIDGenerator(minIdLength, maxAverageWordCount, verbose, verboseDocuments);
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