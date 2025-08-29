# Zero Schema System: A Technical Guide for Agents

This document provides a comprehensive technical overview of the Zero schema system, designed for Language Models (LLMs) and Software Engineering (SWE) agents. It is based on the official Zero documentation and example applications.

## 1. Core Concepts

The Zero architecture utilizes a dual schema system:

1.  **Backend Database Schema:** This is the standard SQL schema for your backend database (e.g., PostgreSQL). It is the single source of truth for your data's structure, constraints, and types.
2.  **Zero Schema:** This is a client-side representation of your backend schema, defined in TypeScript. It is not a database itself, but rather a typed interface that enables Zero's core functionality.

The purpose of the Zero Schema is to:
*   **Provide Compile-Time Typesafety:** It generates TypeScript types for all your tables and columns, allowing you to write type-safe queries in your client-side code.
*   **Define First-Class Relationships:** It allows you to explicitly define relationships (one-to-many, many-to-many) between your tables, which can then be used in Zero's query language (ZQL) to easily fetch related data.
*   **Enable Read Permissions:** The schema is used to define row-level and column-level read permissions. Note that write permissions are not handled at this layer but rather within the logic of [Custom Mutators](../custom-mutators.mdx).

## 2. Recommended Approach: Generating from a Drizzle Schema

The recommended method for creating a Zero schema is to generate it from an existing Drizzle ORM schema. This ensures that your client-side schema is always in sync with your backend source of truth.

### 2.1. Prerequisites

*   A Drizzle ORM schema defined in a TypeScript file (e.g., `schema.ts`).
*   The `drizzle-zero` utility library.

### 2.2. Step-by-Step Guide

The following steps illustrate how to create a `zero-schema.ts` file.

**Step 1: Import Dependencies**
Import `createZeroSchema` from `drizzle-zero` and all exports from your Drizzle schema file.

```typescript
import { createZeroSchema } from "drizzle-zero";
import * as allExports from "./schema.ts"; // Contains Drizzle tables, Zod schemas, etc.
import _ from 'lodash';
```

**Step 2: Filter for Drizzle Table Objects**
If your Drizzle schema file exports more than just tables (e.g., helper types, Zod schemas), you must filter these out. A reliable method is to check for an internal property common to Drizzle table objects, such as `._.tableName`.

```typescript
const drizzleTables = _.pickBy(allExports, (value) => {
    return typeof value === 'object' && value !== null && (value as any)._ && (value as any)._.tableName;
});

const drizzleSchema = {
  ...drizzleTables
};
```

**Step 3: Configure Table and Column Inclusion**
You must explicitly tell `createZeroSchema` which tables and columns to include. A helper function can automate this.

```typescript
function includeAllTablesAndColumns(tablesSchema: typeof drizzleTables): Record<string, Record<string, boolean>> {
  return _.mapValues(tablesSchema, (table) => {
    const columns = (table as any)._.columns;
    return _.mapValues(columns, () => true); // Mark all columns for inclusion
  })
}

const tables = includeAllTablesAndColumns(drizzleTables);
```

**Step 4: Define Many-to-Many Relationships (If Applicable)**
While `drizzle-zero` automatically infers one-to-many relationships from foreign keys, many-to-many relationships must be defined explicitly using the `manyToMany` configuration option. This involves specifying the path through the junction table.

*Example:*
```typescript
export const schema = createZeroSchema(drizzleSchema, {
    version: 1,
    tables,
    manyToMany: {
      doc: { // The source table
        related_docs: [ // The name of the new relationship
          {
            sourceField: ["id"],
            destTable: "doc_to_doc", // The junction table
            destField: ["fk_from_doc"],
          },
          {
            sourceField: ["fk_to_doc"],
            destTable: "doc", // The final destination table
            destField: ["id"],
          },
        ]
    }
  }
});
```

**Step 5: Create the Final Schema**
Call `createZeroSchema` with the prepared configuration.

```typescript
export const schema = createZeroSchema(drizzleSchema, {
    version: 1,
    tables
    // Add manyToMany config here if needed
});
```

## 3. The Manual Zero Schema API

For projects not using Drizzle, the Zero schema can be defined manually.

*   **Core Functions:** `createSchema`, `table`, `relationships`.
*   **Example:**
    ```typescript
    import { table, string, createSchema, relationships } from '@rocicorp/zero';

    // Define tables
    const user = table('user')
      .columns({
        id: string(),
        name: string().optional(),
      })
      .primaryKey('id');

    const message = table('message')
      .columns({
        id: string(),
        senderID: string(),
        text: string(),
      })
      .primaryKey('id');

    // Define relationships
    const messageRelationships = relationships(message, ({ one }) => ({
      sender: one({
        sourceField: ['senderID'],
        destField: ['id'],
        destSchema: user,
      }),
    }));

    // Create the final schema
    export const schema = createSchema({
      tables: [user, message],
      relationships: [messageRelationships],
    });
    ```

## 4. Schema Migrations and Versioning

*   Zero uses structural typing to detect schema changes. When the client connects, it sends its schema to the `zero-cache`. If the schema is incompatible, the server rejects the connection.
*   By default, the Zero client handles this by calling `location.reload()` to fetch the latest version of the application.
*   Database migrations should follow an **"expand/migrate/contract"** pattern to ensure backward compatibility for clients running on older schema versions.
    1.  **Expand:** Add new tables or columns. Provide defaults for existing rows.
    2.  **Migrate:** Deploy the new client-side code that uses the new schema.
    3.  **Contract:** After a grace period, remove the old tables/columns.
