
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../.env') });

interface Snippet {
  body: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  used_at?: string;
}

interface ImportFile {
  meta?: {
    source?: string;
    exported_at?: string;
    version?: string;
  };
  snippets: Snippet[];
}

const argv = yargs(hideBin(process.argv))
  .option('file', {
    alias: 'f',
    description: 'Path to the JSON import file',
    type: 'string',
    demandOption: true,
  })
  .help()
  .alias('h', 'help')
  .parseSync();

const importFilePath = path.resolve(process.cwd(), argv.file);

if (!fs.existsSync(importFilePath)) {
  console.error(`Error: File not found at ${importFilePath}`);
  process.exit(1);
}

try {
  const fileContent = fs.readFileSync(importFilePath, 'utf-8');
  const importData: ImportFile | Snippet[] = JSON.parse(fileContent);

  let snippetsToImport: Snippet[];

  if (Array.isArray(importData)) {
    snippetsToImport = importData;
  } else if (importData.snippets) {
    snippetsToImport = importData.snippets;
  } else {
    console.error('Error: Invalid import file format. Expected an array of snippets or an object with a "snippets" array.');
    process.exit(1);
  }

  console.log(`Found ${snippetsToImport.length} snippets to import.`);

  // Here you would typically send these snippets to your backend API
  // For demonstration, we'll just log them.
  // In a real application, you'd use a fetch or axios call to your tRPC endpoint.

  const TRPC_ENDPOINT = process.env.TRPC_ENDPOINT || 'http://localhost:2025/trpc'; // Adjust as per your server config

  async function importSnippets() {
    for (const snippet of snippetsToImport) {
      try {
        const response = await fetch(`${TRPC_ENDPOINT}/snippet.create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: snippet.body,
            tags: snippet.tags || [],
            // created_at, updated_at, used_at are typically set by the server
            // but if you want to allow importing them, you'd include them here
          }),
        });

        if (response.ok) {
          console.log(`Successfully imported snippet: "${snippet.body.substring(0, 50)}..."`);
        } else {
          const errorData = await response.json();
          console.error(`Failed to import snippet: "${snippet.body.substring(0, 50)}..." - Status: ${response.status}, Error: ${JSON.stringify(errorData)}`);
        }
      } catch (error) {
        console.error(`Error importing snippet: "${snippet.body.substring(0, 50)}..." -`, error);
      }
    }
    console.log('Import process completed.');
  }

  importSnippets();

} catch (error) {
  console.error('Error parsing JSON file:', error);
  process.exit(1);
}
