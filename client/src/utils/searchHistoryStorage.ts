import { SearchHistoryEntry, SearchHistoryState } from "@/types/searchHistory";

const SEARCH_HISTORY_KEY = "snippet_search_history";

export const loadSearchHistory = (): SearchHistoryState => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load search history:", error);
  }
  
  return {
    entries: [],
    globalEventCounter: 0,
  };
};

export const saveSearchHistory = (state: SearchHistoryState): void => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save search history:", error);
  }
};

export const addSearchToHistory = (
  query: string,
  selectedTags: string[],
  filterMode: "and" | "or"
): void => {
  if (!query.trim() && selectedTags.length === 0) {
    return; // Don't save empty searches
  }

  const state = loadSearchHistory();
  
  // Increment global event counter
  state.globalEventCounter += 1;
  
  // Check if this exact search already exists
  const normalizedQuery = query.trim().toLowerCase();
  const sortedTags = [...selectedTags].sort();
  
  const existingEntry = state.entries.find(entry => 
    entry.query.toLowerCase() === normalizedQuery &&
    JSON.stringify([...entry.selectedTags].sort()) === JSON.stringify(sortedTags) &&
    entry.filterMode === filterMode
  );
  
  if (existingEntry) {
    // Update existing entry with new score using arithmetic frecency
    existingEntry.score += state.globalEventCounter;
    existingEntry.last_used_at = new Date().toISOString();
  } else {
    // Create new entry
    const newEntry: SearchHistoryEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      query: query.trim(),
      selectedTags: [...selectedTags],
      filterMode,
      score: state.globalEventCounter,
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    };
    
    state.entries.push(newEntry);
  }
  
  // Sort entries by score (frecency) in descending order
  state.entries.sort((a, b) => b.score - a.score);
  
  // Keep only the top 50 entries to prevent unlimited growth
  state.entries = state.entries.slice(0, 50);
  
  saveSearchHistory(state);
};

export const deleteSearchHistoryEntry = (entryId: string): void => {
  const state = loadSearchHistory();
  state.entries = state.entries.filter(entry => entry.id !== entryId);
  saveSearchHistory(state);
};

export const clearSearchHistory = (): void => {
  const state: SearchHistoryState = {
    entries: [],
    globalEventCounter: 0,
  };
  saveSearchHistory(state);
};
