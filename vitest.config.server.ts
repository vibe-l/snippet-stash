import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [], // e.g., ['server/tests/setup.ts']
    include: ['server/**/*.test.ts'], // Correct path relative to project root
    alias: { // Ensure aliases used by server code are defined if necessary
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      // Add other aliases if your server-side code uses them
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
