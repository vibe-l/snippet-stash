
import { SidebarProvider, SidebarInset, SidebarTrigger, SidebarRail } from "@/components/ui/sidebar";
import SnippetManager from "@/components/SnippetManager";
import SearchHistoryPanel from "@/components/SearchHistoryPanel";
import type { SearchHistory } from "@/lib/schema";
import React, { useState } from "react";
import { useZero } from "@rocicorp/zero/react";
import { nanoid } from "nanoid";

const Index = () => {
  const zero = useZero();
  const [searchState, setSearchState] = useState({
    searchText: "",
    selectedTags: [] as string[],
    filterMode: "or" as "and" | "or",
  });

  const handleRestoreSearch = (entry: SearchHistory) => {
    setSearchState({
      searchText: entry.query,
      selectedTags: entry.selected_tags,
      filterMode: entry.filter_mode as "and" | "or",
    });

    // Add to history when restoring. The server-side mutator will handle
    // incrementing the score if the entry already exists.
    zero.mutate.searchHistory.insert({
      id: nanoid(),
      query: entry.query,
      selected_tags: entry.selected_tags,
      filter_mode: entry.filter_mode,
      score: 1,
    });
  };

  const handleSearchChange = (
    searchText: string,
    selectedTags: string[],
    filterMode: "and" | "or"
  ) => {
    setSearchState({ searchText, selectedTags, filterMode });
  };

  const handleSearchSubmit = () => {
    const { searchText, selectedTags, filterMode } = searchState;
    // Add to history when search is submitted (if there's actual search content)
    if (searchText.trim() || selectedTags.length > 0) {
      zero.mutate.searchHistory.insert({
        id: nanoid(),
        query: searchText,
        selected_tags: selectedTags,
        filter_mode: filterMode,
        score: 1,
      });
    }
  };

  return (
    <SidebarProvider>
      <SidebarInset>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <SidebarTrigger />
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
      <SearchHistoryPanel onRestoreSearch={handleRestoreSearch} />
      <SidebarRail />
    </SidebarProvider>
  );
};

export default Index;
