
export interface SearchHistoryEntry {
  id: number;
  query: string;
  selected_tags: string[];
  filter_mode: "and" | "or";
  score: number;
  created_at: Date;
  last_used_at: Date;
}

export interface SearchHistoryState {
  entries: SearchHistoryEntry[];
  globalEventCounter: number;
}
