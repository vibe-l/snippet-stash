import { definePermissions, ANYONE_CAN } from "@rocicorp/zero";
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

// Define permissions to allow reading all tables
export const permissions = definePermissions<AuthData, Schema>(schema, () => ({
  snippets: {
    row: {
      select: ANYONE_CAN,
      insert: ANYONE_CAN,
      update: {
        preMutation: ANYONE_CAN,
        postMutation: ANYONE_CAN,
      },
      delete: ANYONE_CAN
    }
  },
  searchHistory: {
    row: {
      select: ANYONE_CAN,
      insert: ANYONE_CAN,
      update: {
        preMutation: ANYONE_CAN,
        postMutation: ANYONE_CAN,
      },
      delete: ANYONE_CAN
    }
  },
  users: {
    row: {
      select: ANYONE_CAN,
      insert: ANYONE_CAN,
      update: {
        preMutation: ANYONE_CAN,
        postMutation: ANYONE_CAN,
      },
      delete: ANYONE_CAN
    }
  }
}));
