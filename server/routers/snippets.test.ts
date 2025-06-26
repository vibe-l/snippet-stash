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

  it('createSnippet procedure should create a new snippet', async () => {
    // Arrange
    const mockNewSnippetInput = {
      body: 'New Snippet Body',
      tags: ['new', 'test'],
    };
    const mockCreatedSnippet = {
      id: 3,
      ...mockNewSnippetInput,
      created_at: new Date(),
      updated_at: new Date(),
      used_at: null,
    };

    (storage.createSnippet as vi.Mock).mockResolvedValue(mockCreatedSnippet);
    const caller = appRouter.createCaller({});

    // Act
    const result = await caller.snippets.createSnippet(mockNewSnippetInput);

    // Assert
    expect(result).toEqual(mockCreatedSnippet);
    expect(storage.createSnippet).toHaveBeenCalledTimes(1);
    expect(storage.createSnippet).toHaveBeenCalledWith(mockNewSnippetInput);
  });

  it('updateSnippet procedure should update an existing snippet', async () => {
    // Arrange
    const snippetIdToUpdate = 1;
    const mockUpdateData = {
      body: 'Updated Snippet Body',
      tags: ['updated'],
    };
    const mockUpdatedSnippet = {
      id: snippetIdToUpdate,
      body: 'Updated Snippet Body',
      tags: ['updated'],
      created_at: new Date(), // Assuming these are returned by the update
      updated_at: new Date(), // This should be a new date
      used_at: null,
    };

    (storage.updateSnippet as vi.Mock).mockResolvedValue(mockUpdatedSnippet);
    const caller = appRouter.createCaller({});

    // Act
    const result = await caller.snippets.updateSnippet({
      id: snippetIdToUpdate,
      data: mockUpdateData,
    });

    // Assert
    expect(result).toEqual(mockUpdatedSnippet);
    expect(storage.updateSnippet).toHaveBeenCalledTimes(1);
    expect(storage.updateSnippet).toHaveBeenCalledWith(snippetIdToUpdate, mockUpdateData);
  });

  it('deleteSnippet procedure should delete a snippet', async () => {
    // Arrange
    const snippetIdToDelete = 1;
    (storage.deleteSnippet as vi.Mock).mockResolvedValue(undefined); // deleteSnippet returns void
    const caller = appRouter.createCaller({});

    // Act
    const result = await caller.snippets.deleteSnippet({ id: snippetIdToDelete });

    // Assert
    expect(result).toEqual({ success: true });
    expect(storage.deleteSnippet).toHaveBeenCalledTimes(1);
    expect(storage.deleteSnippet).toHaveBeenCalledWith(snippetIdToDelete);
  });

  it('updateSnippetUsage procedure should update snippet usage timestamp', async () => {
    // Arrange
    const snippetIdForUsageUpdate = 1;
    (storage.updateSnippetUsage as vi.Mock).mockResolvedValue(undefined); // updateSnippetUsage returns void
    const caller = appRouter.createCaller({});

    // Act
    const result = await caller.snippets.updateSnippetUsage({ id: snippetIdForUsageUpdate });

    // Assert
    expect(result).toEqual({ success: true });
    expect(storage.updateSnippetUsage).toHaveBeenCalledTimes(1);
    expect(storage.updateSnippetUsage).toHaveBeenCalledWith(snippetIdForUsageUpdate);
  });
});
