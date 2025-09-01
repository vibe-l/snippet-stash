#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: node diffDocumentIDs.js <file1_path> <file2_path>');
    console.error('Example: node diffDocumentIDs.js documents1_IDs.json documents2_IDs.json');
    process.exit(1);
  }
  
  const [file1Path, file2Path] = args;
  
  // Check if both files exist
  if (!fs.existsSync(file1Path)) {
    console.error(`Error: File ${file1Path} does not exist`);
    process.exit(1);
  }
  
  if (!fs.existsSync(file2Path)) {
    console.error(`Error: File ${file2Path} does not exist`);
    process.exit(1);
  }
  
  try {
    // Read and parse both files
    const file1Content = fs.readFileSync(file1Path, 'utf8');
    const file2Content = fs.readFileSync(file2Path, 'utf8');
    
    const file1Data = JSON.parse(file1Content);
    const file2Data = JSON.parse(file2Content);
    
    // Validate that both files contain arrays
    if (!Array.isArray(file1Data) || !Array.isArray(file2Data)) {
      console.error('Error: Both JSON files must contain arrays');
      process.exit(1);
    }
    
    // Create maps for efficient lookup by document content
    const file1Map = new Map();
    const file2Map = new Map();
    
    file1Data.forEach(item => {
      if (item && typeof item === 'object' && item.document && item.id) {
        file1Map.set(item.document, item.id);
      }
    });
    
    file2Data.forEach(item => {
      if (item && typeof item === 'object' && item.document && item.id) {
        file2Map.set(item.document, item.id);
      }
    });
    
    // Find documents with different IDs
    const file1Name = path.basename(file1Path, path.extname(file1Path));
    const file2Name = path.basename(file2Path, path.extname(file2Path));
    
    const differences = [];
    
    // Check documents in file1 against file2
    for (const [document, id1] of file1Map) {
      if (file2Map.has(document)) {
        const id2 = file2Map.get(document);
        if (id1 !== id2) {
          // IDs are different for the same document
          differences.push({
            [`id_${file1Name}`]: id1,
            [`id_${file2Name}`]: id2,
            document
          });
        }
        // If IDs are the same, we don't include them (as requested)
      } else {
        // Document exists only in file1
        differences.push({
          [`id_${file1Name}`]: id1,
          document
        });
      }
    }
    
    // Check for documents that exist only in file2
    for (const [document, id2] of file2Map) {
      if (!file1Map.has(document)) {
        differences.push({
          [`id_${file2Name}`]: id2,
          document
        });
      }
    }
    
    // Generate output filename and save in first file's directory
    const file1Dir = path.dirname(file1Path);
    const outputFilename = path.join(file1Dir, `${file1Name}_${file2Name}_diff.json`);
    
    // Write the differences to the output file
    fs.writeFileSync(outputFilename, JSON.stringify(differences, null, 2));
    
    console.log(`Diff file created: ${outputFilename}`);
    console.log(`Total documents with differences: ${differences.length}`);
    
  } catch (error) {
    console.error(`Error processing files: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;