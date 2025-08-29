import { definePermissions } from "@rocicorp/zero";
import type { Schema } from "@rocicorp/zero";
import { createZeroSchema } from "drizzle-zero";
import * as drizzleTables from "./drizzle/schema.ts";
import * as drizzleRelations from "./drizzle/relations.ts";
import _ from 'lodash';

const drizzleSchema = {
  ...drizzleTables,
  ...drizzleRelations,
};

function includeAllTablesAndColumns(tablesSchema: typeof drizzleTables): Record<string, Record<string, boolean>> {
  return _.mapValues(tablesSchema, (table) => {
    const dbTable = _.omit(table, ['enableRLS']);
    const inclusions = _.mapValues(dbTable, () => true);
    return _.omit(inclusions, ['getSQL']);
  })
}

const tables = includeAllTablesAndColumns(drizzleTables);
console.log('tables:', tables)


export const schema = createZeroSchema(drizzleSchema, {
    version: 1,
    tables,
    manyToMany: {
      doc: {
        related_docs: [
          {
            sourceField: ["id"],
            destTable: "doc_to_doc",
            destField: ["fk_from_doc"],
          },
          {
            sourceField: ["fk_to_doc"],
            destTable: "doc",
            destField: ["id"],
          },
        ]
    }
  }
});

type AuthData = {
  sub: string;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => ({}));

