
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import SnippetManager from "@/components/SnippetManager";
import SearchHistoryPanel from "@/components/SearchHistoryPanel";
import { SearchHistoryEntry } from "@/types/searchHistory";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";

const Index = () => {
  const [searchState, setSearchState] = useState({
    searchText: "",
    selectedTags: [] as string[],
    filterMode: "or" as "and" | "or"
  });

  // Search history mutation
  const utils = trpc.useUtils();
  const addSearchHistoryMutation = trpc.searchHistory.addSearchHistory.useMutation({
    onSuccess: () => {
      utils.searchHistory.getSearchHistory.invalidate();
      // Trigger custom event to notify the SearchHistoryPanel to refresh
      window.dispatchEvent(new Event('searchHistoryRefresh'));
    }
  });

  const handleRestoreSearch = (entry: SearchHistoryEntry) => {
    setSearchState({
      searchText: entry.query,
      selectedTags: entry.selected_tags,
      filterMode: entry.filter_mode
    });
    
    // Add to history when restoring (increases frecency score)
    addSearchHistoryMutation.mutate({
      query: entry.query,
      selected_tags: entry.selected_tags,
      filter_mode: entry.filter_mode,
      score: entry.score + 1
    });
  };

  const handleSearchChange = (searchText: string, selectedTags: string[], filterMode: "and" | "or") => {
    setSearchState({ searchText, selectedTags, filterMode });
  };

  const handleSearchSubmit = () => {
    const { searchText, selectedTags, filterMode } = searchState;
    // Add to history when search is submitted (if there's actual search content)
    if (searchText.trim() || selectedTags.length > 0) {
      addSearchHistoryMutation.mutate({
        query: searchText,
        selected_tags: selectedTags,
        filter_mode: filterMode,
        score: 1
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SearchHistoryPanel onRestoreSearch={handleRestoreSearch} />
        <SidebarInset>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-6">
              <SidebarTrigger />
              <div className="text-center flex-1">
                <h1 className="text-4xl font-bold mb-2">Snippet Manager</h1>
                <p className="text-muted-foreground">Manage your text snippets with tags and search</p>
              </div>
            </div>
            <div className="max-w-6xl mx-auto">
              <SnippetManager 
                externalSearchState={searchState}
                onSearchChange={handleSearchChange}
                onSearchSubmit={handleSearchSubmit}
              />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Index;
