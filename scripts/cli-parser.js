import { DEFAULT_CONFIG, TEXT_PROCESSING } from './config/constants.js';

export class CliParser {
  constructor() {
    this.jsonFilePath = null;
    this.minIdLength = DEFAULT_CONFIG.MIN_ID_LENGTH;
    this.maxMeanWordCount = null;
    this.verbose = false;
    this.verboseDocuments = null;
  }

  parse(args) {
    if (args.length === 0) {
      throw new Error('No arguments provided');
    }

    this.jsonFilePath = args[0];
    
    // Process arguments
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--verbose' || arg === '-v') {
        this.verbose = true;
        // Check if next argument is document numbers (single number or comma-separated)
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          const nextArg = args[i + 1];
          // Check if it's a number or comma-separated numbers
          if (TEXT_PROCESSING.DOC_NUMBER_REGEX.test(nextArg)) {
            const docNumbers = nextArg.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            if (docNumbers.length > 0) {
              this.verboseDocuments = new Set(docNumbers);
              i++; // Skip the next argument since we consumed it
            }
          }
        }
      } else if (i === 1 && !isNaN(parseFloat(arg))) {
        this.minIdLength = parseInt(arg);
      } else if (i === 2 && !isNaN(parseFloat(arg))) {
        this.maxMeanWordCount = parseFloat(arg);
      }
    }

    return {
      jsonFilePath: this.jsonFilePath,
      minIdLength: this.minIdLength,
      maxMeanWordCount: this.maxMeanWordCount,
      verbose: this.verbose,
      verboseDocuments: this.verboseDocuments
    };
  }

  static getUsageMessage() {
    return 'Usage: node createDocumentIDs.js <json_file> [min_id_length] [max_mean_word_count] [--verbose|-v] [document_numbers]';
  }

  static getExamples() {
    return [
      '  node createDocumentIDs.js documents.json',
      '  node createDocumentIDs.js documents.json 15',
      '  node createDocumentIDs.js documents.json 15 5.2',
      '  node createDocumentIDs.js documents.json --verbose',
      '  node createDocumentIDs.js documents.json --verbose 0,1,5'
    ];
  }

  static getOptions() {
    return [
      '  --verbose, -v    Enable verbose logging',
      '  --verbose N      Enable verbose logging for specific documents (comma-separated numbers)'
    ];
  }
}