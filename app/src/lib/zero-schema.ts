import { createBuilder, Schema } from "@rocicorp/zero";
import { schema as genSchema } from "./zero-schema.gen";

export const schema = {
  ...genSchema,
  enableLegacyQueries: true,
} as const satisfies Schema;

export const builder = createBuilder(schema);
