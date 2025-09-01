import type { CustomMutatorDefs, Transaction } from '@rocicorp/zero';
import { schema } from './zero-schema.js';
import type { InsertSnippet, Snippet, InsertSearchHistory, InsertUser, User } from './schema.js';
import { nanoid } from 'nanoid';

type Schema = typeof schema;

export function createMutators() {
    return {
        // User methods
        createUser: async (tx: Transaction<Schema>, user: InsertUser) => {
            await tx.mutate.users.insert({ ...user, id: 0 });
        },
        
        // Snippet methods
        createSnippet: async (tx: Transaction<Schema>, snippet: InsertSnippet) => {
            const now = new Date().getTime();
            await tx.mutate.snippets.insert({
                ...snippet,
                tags: snippet.tags || [],
                created_at: now,
                updated_at: now,
                used_at: 0,
            });
        },
        updateSnippet: async (tx: Transaction<Schema>, { id, ...snippet }: { id: string } & Partial<Omit<Snippet, 'id'>>) => {
            // We manually update the `updated_at` timestamp on the client for the optimistic update.
            await tx.mutate.snippets.update({ id, ...snippet, updated_at: new Date().getTime() } as any);
        },
        deleteSnippet: async (tx: Transaction<Schema>, { id }: { id: string }) => {
            await tx.mutate.snippets.delete({ id });
        },
        updateSnippetUsage: async (tx: Transaction<Schema>, { id }: { id: string }) => {
            await tx.mutate.snippets.update({ id, used_at: new Date().getTime() });
        },
        
        // Search history methods
        addSearchHistory: async (tx: Transaction<Schema>, search: InsertSearchHistory) => {
            const { query, selected_tags, filter_mode, score } = search;
            
            // Check if an identical search already exists
            const allHistory = await tx.query.searchHistory.run();
            const existing = allHistory.find(h => 
                h.query === query && 
                JSON.stringify(h.selected_tags) === JSON.stringify(selected_tags || []) && 
                h.filter_mode === filter_mode
            );
            
            if (existing) {
                // If it exists, update the score and last_used_at timestamp
                await tx.mutate.searchHistory.update({
                    id: existing.id,
                    score: existing.score + (score || 1),
                    last_used_at: new Date().getTime()
                });
            } else {
                // If it doesn't exist, create a new entry with nanoid
                const now = new Date().getTime();
                await tx.mutate.searchHistory.insert({
                    ...search,
                    selected_tags: selected_tags || [],
                    score: score || 1,
                    id: nanoid(),
                    created_at: now,
                    last_used_at: now,
                });
            }
        },
        updateSearchHistoryScore: async (tx: Transaction<Schema>, { id, score }: { id: string, score: number }) => {
            await tx.mutate.searchHistory.update({ id, score, last_used_at: new Date().getTime() });
        },
        deleteSearchHistory: async (tx: Transaction<Schema>, { id }: { id: string }) => {
            await tx.mutate.searchHistory.delete({ id });
        },
        clearSearchHistory: async (tx: Transaction<Schema>) => {
            const allHistory = await tx.query.searchHistory.run();
            // This is not the most efficient way, but it's the only way to do this
            // with the basic client-side mutators. A server-side custom mutator
            // can implement this with a single `DELETE` statement.
            for (const item of allHistory) {
                await tx.mutate.searchHistory.delete({ id: item.id });
            }
        },
    } as const satisfies CustomMutatorDefs<Schema>;
}
