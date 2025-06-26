import { describe, it, expect, vi } from 'vitest';
import { appRouter } from './_app'; // Assuming your root router is exported as appRouter from _app.ts
import { storage } from '../storage'; // Import the actual storage

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    getSnippets: vi.fn(),
    createSnippet: vi.fn(),
    updateSnippet: vi.fn(),
    deleteSnippet: vi.fn(),
    updateSnippetUsage: vi.fn(),
  },
}));

describe('Snippet Router - Integration Tests', () => {
  it('getAll procedure should return correct data structure', async () => {
    // Arrange
    const mockSnippets = [
      { id: 1, body: 'Snippet 1', tags: ['tag1'], created_at: new Date(), updated_at: new Date(), used_at: null },
      { id: 2, body: 'Snippet 2', tags: ['tag2'], created_at: new Date(), updated_at: new Date(), used_at: null },
    ];

    // Explicitly type the mocked function
    (storage.getSnippets as vi.Mock).mockResolvedValue(mockSnippets);

    const caller = appRouter.createCaller({});

    // Act
    const result = await caller.snippets.getSnippets(); // Changed 'snippet' to 'snippets'

    // Assert
    expect(result).toEqual(mockSnippets);
    expect(storage.getSnippets).toHaveBeenCalledTimes(1);
  });
});
