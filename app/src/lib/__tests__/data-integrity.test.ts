import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const SCRIPT_PATH = path.resolve(__dirname, '../../../../scripts/createDocumentIDs.js');

describe('Data file integrity', () => {
  it('should maintain consistent prompts.json structure', () => {
    const filePath = path.join(FIXTURES_DIR, 'prompts.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');
    expect(hash).toMatchSnapshot();
  });

  it('should generate consistent prompts_IDs.json and CSV files', () => {
    const inputPath = path.join(FIXTURES_DIR, 'prompts.json');
    const outputPath = path.join(FIXTURES_DIR, 'prompts_IDs.json');
    const csvPath = path.join(FIXTURES_DIR, 'prompts_doc_word_count.csv');
    
    // Clean up existing CSV file to ensure fresh generation
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    
    // Run the script to regenerate files
    execSync(`tsx "${SCRIPT_PATH}" "${inputPath}"`, { stdio: 'inherit' });
    
    // Verify the generated IDs file structure
    const idsContent = fs.readFileSync(outputPath, 'utf8');
    const idsHash = createHash('sha256').update(idsContent).digest('hex');
    expect(idsHash).toMatchSnapshot();
    
    // Verify the generated CSV structure
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvLines = csvContent.split('\n').slice(0, 10); // First 10 lines
    expect(csvLines).toMatchSnapshot();
  });
});

describe('Data structure validation', () => {
  it('should maintain prompts.json schema', () => {
    const filePath = path.join(FIXTURES_DIR, 'prompts.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const schema = {
      type: Array.isArray(data) ? 'array' : 'object',
      length: Array.isArray(data) ? data.length : Object.keys(data).length,
      sampleKeys: Array.isArray(data) && data.length > 0 
        ? Object.keys(data[0] || {}).sort() 
        : Object.keys(data).slice(0, 5).sort(),
      firstItemType: Array.isArray(data) && data.length > 0 
        ? typeof data[0] 
        : 'N/A'
    };
    expect(schema).toMatchSnapshot();
  });

  it('should maintain prompts_IDs.json schema', () => {
    const filePath = path.join(FIXTURES_DIR, 'prompts_IDs.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const schema = {
      type: Array.isArray(data) ? 'array' : 'object',
      length: Array.isArray(data) ? data.length : Object.keys(data).length,
      sampleKeys: Array.isArray(data) && data.length > 0 
        ? Object.keys(data[0] || {}).sort() 
        : Object.keys(data).slice(0, 5).sort(),
      firstItemType: Array.isArray(data) && data.length > 0 
        ? typeof data[0] 
        : 'N/A'
    };
    expect(schema).toMatchSnapshot();
  });

  it('should maintain CSV header structure', () => {
    const filePath = path.join(FIXTURES_DIR, 'prompts_doc_word_count.csv');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const header = lines[0];
    const sampleRowCount = Math.min(5, lines.length - 1);
    
    const csvStructure = {
      header: header.split(','),
      totalRows: lines.length - 1, // Excluding header
      sampleRowCount,
      hasValidRows: lines.slice(1, sampleRowCount + 1).every(line => 
        line.split(',').length === header.split(',').length
      )
    };
    expect(csvStructure).toMatchSnapshot();
  });

  it('should track data file counts and sizes', () => {
    const files = [
      'prompts.json',
      'prompts_IDs.json', 
      'prompts_doc_word_count.csv'
    ];
    
    const stats = files.map(filename => {
      const filePath = path.join(FIXTURES_DIR, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        sizeBytes: stats.size,
        sizeCategory: stats.size < 1024 ? 'small' 
          : stats.size < 1024 * 1024 ? 'medium' : 'large'
      };
    });
    
    expect(stats).toMatchSnapshot();
  });
});