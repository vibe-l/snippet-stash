
export interface SearchHistoryEntry {
  id: string;
  query: string;
  selectedTags: string[];
  filterMode: "and" | "or";
  score: number;
  created_at: string;
  last_used_at: string;
}

export interface SearchHistoryState {
  entries: SearchHistoryEntry[];
  globalEventCounter: number;
}
