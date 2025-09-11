import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// pnpm drizzle-kit pull --config=test/drizzle.config.ts

export const config = {
  out: 'test/drizzle',
  schema: 'test/drizzle/schema.ts',
  dialect: 'postgresql' as any,
  dbCredentials: {
    url: "postgresql://test_drizzle_zero:CWoKaVCbRb@localhost:5432/test_drizzle_zero",
  },
  schemaFilter: ["public"],
  introspect: { casing: "preserve" as any } ,
};

export default defineConfig(config);