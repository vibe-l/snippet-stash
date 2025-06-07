
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import SnippetManager from "@/components/SnippetManager";
import SearchHistoryPanel from "@/components/SearchHistoryPanel";
import { SearchHistoryEntry } from "@/types/searchHistory";
import { addSearchToHistory } from "@/utils/searchHistoryStorage";
import React, { useState } from "react";

const Index = () => {
  const [searchState, setSearchState] = useState({
    searchText: "",
    selectedTags: [] as string[],
    filterMode: "or" as "and" | "or"
  });

  const handleRestoreSearch = (entry: SearchHistoryEntry) => {
    setSearchState({
      searchText: entry.query,
      selectedTags: entry.selectedTags,
      filterMode: entry.filterMode
    });
    
    // Add to history when restoring (increases frecency score)
    addSearchToHistory(entry.query, entry.selectedTags, entry.filterMode);
  };

  const handleSearchChange = (searchText: string, selectedTags: string[], filterMode: "and" | "or") => {
    setSearchState({ searchText, selectedTags, filterMode });
  };

  const handleSearchSubmit = () => {
    const { searchText, selectedTags, filterMode } = searchState;
    // Add to history when search is submitted (if there's actual search content)
    if (searchText.trim() || selectedTags.length > 0) {
      addSearchToHistory(searchText, selectedTags, filterMode);
      // Trigger custom event to notify the SearchHistoryPanel to refresh
      window.dispatchEvent(new Event('searchHistoryRefresh'));
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
