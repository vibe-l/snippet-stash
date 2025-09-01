#!/usr/bin/env node

import fs from 'fs';

function computeAverageWordCount(csvFilePath) {
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File ${csvFilePath} does not exist`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(csvFilePath, 'utf8');
    const lines = content.trim().split('\n').slice(1); // Skip header
    
    if (lines.length === 0) {
      console.log('No data found in CSV file');
      return 0;
    }

    let totalCount = 0;
    let wordCount = 0;

    for (const line of lines) {
      if (line.trim()) {
        const [word, count] = line.split(',');
        const countNum = parseInt(count);
        if (!isNaN(countNum)) {
          totalCount += countNum;
          wordCount++;
        }
      }
    }

    if (wordCount === 0) {
      console.log('No valid word counts found');
      return 0;
    }

    const average = totalCount / wordCount;
    console.log(`Average word count: ${average.toFixed(2)}`);
    console.log(`Total words: ${wordCount}`);
    console.log(`Total count: ${totalCount}`);
    
    return average;
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node computeAverageWordCount.js <csv_file_path>');
    console.error('Example: node computeAverageWordCount.js test_documents_doc_word_count.csv');
    process.exit(1);
  }
  
  const csvFilePath = args[0];
  computeAverageWordCount(csvFilePath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { computeAverageWordCount };