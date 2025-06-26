import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from './index';
import { storage } from './storage';
import type http from 'http';
import type express from 'express';

// Mock the storage module
vi.mock('./storage', () => ({
  storage: {
    getSnippets: vi.fn(),
    // Add other methods if they are called directly or indirectly by the tested routes
  },
}));

// Mock server/vite.ts to prevent setupVite and serveStatic from running
vi.mock('./vite', () => ({
  setupVite: vi.fn().mockResolvedValue(undefined),
  serveStatic: vi.fn(),
  log: vi.fn(), // Mock log if it's called in ways that might interfere
}));


describe('Snippet API Routes', () => {
  let server: http.Server;
  let app: express.Express;

  beforeEach(async () => {
    // Set NODE_ENV to 'test' or a specific value if your app logic depends on it
    // for disabling/enabling features not relevant to these tests.
    // process.env.NODE_ENV = 'test'; // Already set by the if condition in index.ts
    const created = await createApp();
    app = created.app;
    server = created.server;
    // Supertest can take an http.Server instance or the Express app itself.
    // If app.listen hasn't been called, pass the app. If it has, pass the server.
    // Since we control server creation and don't call listen in test, app is fine.
    // However, some supertest versions/setups prefer the raw http.Server.
    // The `server` returned by `registerRoutes` is what supertest needs.
  });

  afterEach(() => {
    // Close the server if it was started and listening.
    // In our current setup with createApp, server.listen is not called by tests,
    // so server.close() might not be strictly necessary unless supertest starts it.
    // However, it's good practice if the server instance might be listening.
    // Supertest typically handles this for http.Server instances passed to it.
    vi.clearAllMocks(); // Clear mocks between tests
  });

  describe('GET /api/snippets', () => {
    it('should return an array of snippets with correct structure', async () => {
      const mockSnippets = [
        {
          id: 1,
          body: 'Test snippet 1',
          tags: ['test', 'api'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          used_at: null,
        },
        {
          id: 2,
          body: 'Test snippet 2',
          tags: ['example'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          used_at: new Date().toISOString(),
        },
      ];

      (storage.getSnippets as vi.Mock).mockResolvedValue(mockSnippets);

      // Pass the http.Server instance to supertest
      const response = await supertest(server).get('/api/snippets');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(mockSnippets.length);

      response.body.forEach((snippet: any, index: number) => {
        expect(snippet).toHaveProperty('id', mockSnippets[index].id);
        expect(snippet).toHaveProperty('body', mockSnippets[index].body);
        expect(snippet).toHaveProperty('tags');
        expect(snippet.tags).toEqual(expect.arrayContaining(mockSnippets[index].tags));
        expect(snippet).toHaveProperty('created_at');
        expect(new Date(snippet.created_at).toISOString()).toBe(mockSnippets[index].created_at);
        expect(snippet).toHaveProperty('updated_at');
        expect(new Date(snippet.updated_at).toISOString()).toBe(mockSnippets[index].updated_at);
        expect(snippet).toHaveProperty('used_at');
        if (mockSnippets[index].used_at) {
          expect(new Date(snippet.used_at).toISOString()).toBe(mockSnippets[index].used_at);
        } else {
          expect(snippet.used_at).toBeNull();
        }
      });

      // Verify that the mocked function was called
      expect(storage.getSnippets).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if storage.getSnippets throws an error', async () => {
      // Setup the mock to throw an error
      (storage.getSnippets as vi.Mock).mockRejectedValue(new Error('Database error'));

      const response = await supertest(app).get('/api/snippets');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to fetch snippets');

      // Verify that the mocked function was called
      expect(storage.getSnippets).toHaveBeenCalledTimes(1);
    });
  });

  // Add more describe blocks for other routes (POST, PUT, DELETE) if needed
});
