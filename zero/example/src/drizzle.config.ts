import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: 'src/drizzle',
  schema: 'src/drizzle/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.ZERO_UPSTREAM_DB!,
  },
  schemaFilter: ["public"],
  introspect: { casing: "preserve" },
});