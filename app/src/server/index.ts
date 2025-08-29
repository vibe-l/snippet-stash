import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import {
  PushProcessor,
  ZQLDatabase,
  PostgresJSConnection,
  type ServerTransaction,
} from '@rocicorp/zero/pg';
import postgres from 'postgres';
import { schema } from '../lib/zero-schema.js';
import { createMutators as createClientMutators } from '../lib/mutators.js';
import type { InsertSearchHistory } from '../lib/schema.js';

// Initialize the database connection.
// The connection string should be in the ZERO_UPSTREAM_DB environment variable.
const sql = postgres(process.env.ZERO_UPSTREAM_DB!);
const conn = new PostgresJSConnection(sql);
const zql = new ZQLDatabase(conn, schema);
const processor = new PushProcessor(zql);

// Create server-side mutators, extending the client-side ones with server-authoritative logic.
function createServerMutators() {
    const clientMutators = createClientMutators();
    return {
        ...clientMutators,
        // Override the `addSearchHistory` mutator to provide server-authoritative logic.
        addSearchHistory: async (tx: ServerTransaction, search: InsertSearchHistory) => {
            const { query, selected_tags, filter_mode, score } = search;

            // Use the raw postgres transaction to find if an identical search already exists.
            const existing = await tx.dbTransaction`
                SELECT id, score FROM search_history
                WHERE query = ${query} AND selected_tags = ${selected_tags} AND filter_mode = ${filter_mode}
                LIMIT 1
            `;

            if (existing.length > 0) {
                // If it exists, update the score and last_used_at timestamp.
                const existingEntry = existing[0];
                await tx.dbTransaction`
                    UPDATE search_history
                    SET score = ${existingEntry.score + (score || 1)}, last_used_at = NOW()
                    WHERE id = ${existingEntry.id}
                `;
            } else {
                // If it doesn't exist, create a new entry using the standard mutator.
                await tx.mutate.searchHistory.insert(search);
            }
        },
    };
}

export const app = new Hono().basePath('/api');

app.post('/push', async (c) => {
  // Here you would typically get authentication data from the request.
  const mutators = createServerMutators();
  const result = await processor.process(mutators, c.req.raw);
  return c.json(result);
});

// This makes the Hono app compatible with Vercel's serverless functions.
export default handle(app);
