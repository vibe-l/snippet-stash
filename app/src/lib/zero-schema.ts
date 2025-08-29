import { definePermissions } from "@rocicorp/zero";
import type { Schema } from "@rocicorp/zero";
import { drizzleZeroConfig } from "drizzle-zero";
import { snippets, users, searchHistory } from "./schema";
import _ from 'lodash';

const drizzleSchema = {
  snippets,
  users,
  searchHistory,
};

const tables = _.mapValues(drizzleSchema, () => true);

// Create the Zero schema.
export const schema = drizzleZeroConfig(drizzleSchema, {
    tables,
    // No many-to-many relationships are defined in the original schema.
});

// Define AuthData type for permissions.
type AuthData = {
  sub: string;
};

// Define empty permissions for now. Read permissions will be configured later if needed.
export const permissions = definePermissions<AuthData, Schema>(schema, () => ({}));
