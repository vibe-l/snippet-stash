export const DEFAULT_CONFIG = {
  MIN_ID_LENGTH: 30,
  MIN_WORD_LENGTH: 2,
  MIN_LEMMA_LENGTH: 3,
  LARGE_DATASET_THRESHOLD: 10000
};

export const STOPWORDS = new Set([
  'will', 'was', 'were', 'been', 'are', 'is', 'be', 'am'
]);

export const TEXT_PROCESSING = {
  WORD_REGEX: /[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g,
  WHITESPACE_REGEX: /\s+/g,
  NUMBER_REGEX: /\d/,
  DOC_NUMBER_REGEX: /^[\d,\s]+$/
};

export const FILE_EXTENSIONS = {
  JSON: '.json',
  CSV: '.csv'
};

export const CSV_HEADERS = {
  WORD_COUNT: 'word,count'
};

export const CLI_MESSAGES = {
  USAGE: 'Usage: node createDocumentIDs.js <json_file_path> [minIdLength] [maxMeanWordCount] [--verbose|-v [doc_numbers]]',
  EXAMPLES: [
    'Example: node createDocumentIDs.js documents.json 30 5 --verbose',
    'Example: node createDocumentIDs.js documents.json 30 5 -v 241',
    'Example: node createDocumentIDs.js documents.json 30 5 -v 0,2,5'
  ],
  OPTIONS: [
    '  --verbose, -v [doc_numbers]    Enable verbose debug output',
    '                                 Optionally specify comma-separated document indices (0-based)'
  ]
};

export const ERROR_MESSAGES = {
  MIN_ID_LENGTH: 'minIdLength must be a positive number',
  MAX_MEAN_WORD_COUNT: 'maxMeanWordCount must be null or a non-negative number',
  VERBOSE: 'verbose must be a boolean',
  FILE_NOT_EXIST: 'File does not exist',
  FILE_EMPTY: 'File is empty',
  FILE_HEADER: 'File must have at least a header and one data line',
  DOCUMENTS_ARRAY: 'documents must be an array',
  DOCUMENTS_EMPTY: 'documents array cannot be empty',
  DOCUMENTS_STRINGS: 'all documents must be strings',
  DOC_WORD_COUNT_PATH: 'docWordCountPath must be null or a string',
  FILE_PATH_STRING: 'filePath must be a non-empty string',
  NO_WORD_COUNTS: 'No word counts to cache',
  JSON_ARRAY: 'JSON file must contain an array of strings',
  ARRAY_STRINGS: 'All elements in the array must be strings'
};