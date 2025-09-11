
import { Sidebar, SidebarTrigger } from "@/components/ui/sidebar";
import SnippetManager from "@/components/SnippetManager";
import MainPanel from "@/components/MainPanel";
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
    <div className="flex flex-1">
      <main className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-6">
          <SidebarTrigger />
        </div>
        <div className="max-w-6xl mx-auto">
          <SnippetManager
            externalSearchState={searchState}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            showControlPanel={false}
          />
        </div>
      </main>
      <Sidebar collapsible="icon" side="right" className="border-l flex-shrink-0">
        <MainPanel
          onRestoreSearch={handleRestoreSearch}
          externalSearchState={searchState}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
        />
      </Sidebar>
    </div>
  );
};

export default Index;
