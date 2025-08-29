import { definePermissions } from "@rocicorp/zero";
import type { Schema } from "@rocicorp/zero";
import { createZeroSchema } from "drizzle-zero";
import * as allExports from "./schema.js";
import _ from 'lodash';

// Filter out non-table exports from the schema file.
// Drizzle tables have a `_` property with metadata.
const drizzleTables = _.pickBy(allExports, (value) => {
    return typeof value === 'object' && value !== null && (value as any)._ && (value as any)._.tableName;
});

const drizzleSchema = {
  ...drizzleTables
};

// Helper function to create the 'tables' configuration object for createZeroSchema.
// It marks all columns of the filtered tables for inclusion in the Zero schema.
function includeAllTablesAndColumns(tablesSchema: typeof drizzleTables): Record<string, Record<string, boolean>> {
  return _.mapValues(tablesSchema, (table) => {
    const columns = (table as any)._.columns;
    return _.mapValues(columns, () => true);
  })
}

const tables = includeAllTablesAndColumns(drizzleTables);

// Create the Zero schema.
export const schema = createZeroSchema(drizzleSchema, {
    version: 1,
    tables,
    // No many-to-many relationships are defined in the original schema.
});

// Define AuthData type for permissions.
type AuthData = {
  sub: string;
};

// Define empty permissions for now. Read permissions will be configured later if needed.
export const permissions = definePermissions<AuthData, Schema>(schema, () => ({}));
