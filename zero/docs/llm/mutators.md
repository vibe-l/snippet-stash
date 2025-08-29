# Zero Custom Mutators: A Technical Guide for Agents

This document provides a technical guide to creating and using Custom Mutators in the Zero framework.

## 1. Core Concepts

Custom Mutators are the primary mechanism for writing data in Zero. They replace basic CRUD operations with arbitrary, developer-defined functions that run on both the client and the server.

*   **Optimistic Execution:** Mutators execute instantly on the client for a fast user experience. The changes are applied to the local cache immediately.
*   **Server Authority:** The same mutator logic is then executed on the server. The server's result is the source of truth and will overwrite the client's optimistic update. This pattern is essential for validation, permissions, and running server-side logic (e.g., sending emails).
*   **Transactional:** Each mutator runs within a transaction. On the client, this ensures consistency in the local cache. On the server, it ensures atomic writes to the database.

## 2. Defining Mutators

Mutators are typically defined in a `mutators.ts` file. They are exported via a `createMutators` function.

### 2.1. Client-Side Mutator Definition

The `createMutators` function returns an object where keys are the names of your mutators. Each mutator is an `async` function that receives the `Transaction` object (`tx`) and its arguments.

```typescript
// src/lib/mutators.ts
import type { CustomMutatorDefs, Transaction } from '@rocicorp/zero';
import { schema } from './zero-schema.js';
import type { InsertSnippet } from './schema.js';

type Schema = typeof schema;

export function createMutators() {
    return {
        // A mutator named 'createSnippet'
        createSnippet: async (tx: Transaction, snippet: InsertSnippet) => {
            await tx.mutate.snippets.insert(snippet);
        },
        // ... other mutators
    } as const satisfies CustomMutatorDefs<Schema>;
}
```

### 2.2. The `Transaction` Object (`tx`)

The `tx` object is the key to interacting with the data layer inside a mutator.

*   **`tx.mutate`:** Provides basic, untyped CRUD operations for writing data.
    *   `tx.mutate.tableName.insert(object)`
    *   `tx.mutate.tableName.update({ id, ...data })`
    *   `tx.mutate.tableName.delete({ id })`
*   **`tx.query`:** Provides the full ZQL query builder for reading data within the transaction. This is useful for validation logic that needs to check the current state of the database.
    ```typescript
    const prev = await tx.query.issue.where('id', id).one();
    if (prev.isArchived) {
        throw new Error("Cannot edit an archived issue.");
    }
    ```
*   **`tx.location`:** A property that is either `'client'` or `'server'`, allowing you to run different logic depending on where the mutator is executing.

## 3. Server-Side Push Endpoint

To process mutators on the server, you must create a "push" endpoint.

### 3.1. Server Setup (with Hono)

The documentation recommends a lightweight server like Hono. The server uses a `PushProcessor` from `@rocicorp/zero/pg` to handle the incoming mutations.

```typescript
// src/server/index.ts
import { Hono } from 'hono';
import { PushProcessor, ZQLDatabase, PostgresJSConnection, type ServerTransaction } from '@rocicorp/zero/pg';
import postgres from 'postgres';
import { schema } from '../lib/zero-schema.js';
import { createMutators as createClientMutators } from '../lib/mutators.js';

// 1. Initialize DB connection and Zero's processor
const sql = postgres(process.env.ZERO_UPSTREAM_DB!);
const conn = new PostgresJSConnection(sql);
const zql = new ZQLDatabase(conn, schema);
const processor = new PushProcessor(zql);

// 2. Create the Hono app and the /push route
export const app = new Hono().basePath('/api');
app.post('/push', async (c) => {
  const mutators = createServerMutators(); // See below
  const result = await processor.process(mutators, c.req.raw);
  return c.json(result);
});
```

### 3.2. Server-Authoritative Logic

You can override client-side mutators on the server to enforce rules. Create a `createServerMutators` function that imports the client mutators and overrides specific ones.

```typescript
function createServerMutators() {
    const clientMutators = createClientMutators();
    return {
        ...clientMutators,
        // Override 'addSearchHistory' with server-authoritative logic
        addSearchHistory: async (tx: ServerTransaction, search: InsertSearchHistory) => {
            // ... server-only logic ...
        },
    };
}
```

### 3.3. Dropping to Raw SQL

For complex operations not supported by ZQL, you can use the raw database transaction available on the server. The `ServerTransaction` object has a `dbTransaction` property.

```typescript
addSearchHistory: async (tx: ServerTransaction, search: InsertSearchHistory) => {
    // tx.dbTransaction is a raw postgres.js transaction object
    const existing = await tx.dbTransaction`
        SELECT id, score FROM search_history WHERE query = ${search.query}
    `;
    if (existing.length > 0) {
        // ...
    } else {
        await tx.mutate.searchHistory.insert(search);
    }
},
```

## 4. Permissions and Authentication

Write permissions are handled directly within your mutators.

1.  **Pass Auth Data:** Your `createMutators` function should accept an `authData` argument containing the current user's information (e.g., decoded JWT).
2.  **Check Permissions:** Inside a mutator, check the `authData` before performing any operation. If the check fails, throw an error.

```typescript
// mutators.ts
export function createMutators(authData: { sub: string } | undefined) {
  return {
    deleteSnippet: async (tx: Transaction, { id }: { id: number }) => {
      if (!authData) {
        throw new Error("Not authorized");
      }
      const snippet = await tx.query.snippets.where('id', id).one();
      // Assuming a `userId` column on the snippet table
      if (snippet.userId !== authData.sub) {
        throw new Error("Permission denied");
      }
      await tx.mutate.snippets.delete({ id });
    },
  };
}
```

On the server, you would extract the JWT from the request, decode it, and pass the resulting `authData` to `createServerMutators`.
