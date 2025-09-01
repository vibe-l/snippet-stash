#!/usr/bin/env node

import fs from 'fs';
import { DocumentIDGenerator } from '../app/src/lib/DocumentIDGenerator.ts';
import { CliParser } from './cli-parser.js';
import { ERROR_MESSAGES, FILE_EXTENSIONS } from '../app/src/config/constants.js';

export class DocumentIdsCLI {
  constructor() {
    this.parser = new CliParser();
  }

  validateInputFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} does not exist`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const documents = JSON.parse(content);
    
    if (!Array.isArray(documents)) {
      throw new Error(ERROR_MESSAGES.JSON_ARRAY);
    }
    
    if (!documents.every(doc => typeof doc === 'string')) {
      throw new Error(ERROR_MESSAGES.ARRAY_STRINGS);
    }

    return documents;
  }

  generateOutputPaths(inputPath) {
    const docWordCountPath = inputPath.replace(
      new RegExp(`\\${FILE_EXTENSIONS.JSON}$`, 'i'), 
      '_doc_word_count' + FILE_EXTENSIONS.CSV
    );
    
    const outputPath = inputPath.replace(
      new RegExp(`\\${FILE_EXTENSIONS.JSON}$`, 'i'), 
      '_IDs' + FILE_EXTENSIONS.JSON
    );

    return { docWordCountPath, outputPath };
  }

  run(args) {
    try {
      const config = this.parser.parse(args);
      const documents = this.validateInputFile(config.jsonFilePath);
      const { docWordCountPath, outputPath } = this.generateOutputPaths(config.jsonFilePath);
      
      const generator = new DocumentIDGenerator(
        config.minIdLength,
        config.maxMeanWordCount,
        config.verbose,
        config.verboseDocuments
      );
      
      const ids = generator.generateIds(documents, docWordCountPath);
      
      // Cache the word count data
      generator.cacheDocWordCounts(docWordCountPath);
      
      const results = documents.map((doc, index) => ({
        id: ids[index],
        document: doc
      }));
      
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      
      console.log(`Generated IDs written to: ${outputPath}`);
      console.log(`Document word counts cached to: ${docWordCountPath}`);
      
    } catch (error) {
      if (error.message === 'No arguments provided') {
        this.showUsage();
        process.exit(1);
      } else {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
    }
  }

  showUsage() {
    console.error(CliParser.getUsageMessage());
    CliParser.getExamples().forEach(example => console.error(example));
    console.error('Options:');
    CliParser.getOptions().forEach(option => console.error(option));
  }
}

function main() {
  const cli = new DocumentIdsCLI();
  cli.run(process.argv.slice(2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DocumentIDGenerator };