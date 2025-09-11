import React, { useState, useEffect, useMemo } from "react";
import ControlPanel from "./ControlPanel";
import type { Snippet } from "@/lib/zero-schema.gen";
import FlexSearch from "flexsearch";
import { useToast } from "@/hooks/use-toast";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { nanoid } from "nanoid";
import { mySnippets } from "@/lib/syncedQueries";

interface SidebarControlPanelProps {
  externalSearchState?: {
    searchText: string;
    selectedTags: string[];
    filterMode: "and" | "or";
  };
  onSearchChange?: (searchText: string, selectedTags: string[], filterMode: "and" | "or") => void;
  onSearchSubmit?: () => void;
}

const SidebarControlPanel: React.FC<SidebarControlPanelProps> = ({ 
  externalSearchState, 
  onSearchChange,
  onSearchSubmit
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"and" | "or">("or");
  const [showTagManager, setShowTagManager] = useState(false);
  const { toast } = useToast();
  const zero = useZero();

  // Use external search state if provided
  const effectiveSearchText = externalSearchState?.searchText ?? searchText;
  const effectiveSelectedTags = externalSearchState?.selectedTags ?? selectedTags;
  const effectiveFilterMode = externalSearchState?.filterMode ?? filterMode;

  // Update internal state when external state changes
  useEffect(() => {
    if (externalSearchState) {
      setSearchText(externalSearchState.searchText);
      setSelectedTags(externalSearchState.selectedTags);
      setFilterMode(externalSearchState.filterMode);
    }
  }, [externalSearchState]);

  // Fetch snippets from database using Zero
  const [snippets = [], snippetsResult] = useQuery(mySnippets(1));
  const typedSnippets = snippets as Snippet[];

  // Create FlexSearch index
  const searchIndex = useMemo(() => {
    const index = new FlexSearch.Index({
      tokenize: "forward",
      resolution: 9,
    });
    
    snippets.forEach((snippet, i) => {
      const tags = snippet.tags || [];
      const searchableText = `${snippet.body} ${tags.join(" ")}`;
      index.add(i, searchableText);
    });
    
    return index;
  }, [snippets]);

  const handleSearchTextChange = useMemo(() => (newSearchText: string) => {
    setSearchText(newSearchText);
    if (onSearchChange) {
      onSearchChange(newSearchText, effectiveSelectedTags, effectiveFilterMode);
    }
  }, [onSearchChange, effectiveSelectedTags, effectiveFilterMode]);

  const handleSelectedTagsChange = useMemo(() => (newSelectedTags: string[]) => {
    setSelectedTags(newSelectedTags);
    if (onSearchChange) {
      onSearchChange(effectiveSearchText, newSelectedTags, effectiveFilterMode);
    }
  }, [onSearchChange, effectiveSearchText, effectiveFilterMode]);

  const handleFilterModeChange = useMemo(() => (newFilterMode: "and" | "or") => {
    setFilterMode(newFilterMode);
    if (onSearchChange) {
      onSearchChange(effectiveSearchText, effectiveSelectedTags, newFilterMode);
    }
  }, [onSearchChange, effectiveSearchText, effectiveSelectedTags]);

  const addNewSnippet = useMemo(() => () => {
    const snippetId = nanoid();
    const now = new Date();
    zero.mutate.snippets.insert({
      id: snippetId,
      body: "",
      tags: [],
      author_id: 1,
      created_at: now,
      updated_at: now,
    }).then(() => {
      toast({ title: "Snippet created successfully" });
    }).catch(() => {
      toast({ title: "Failed to create snippet", variant: "destructive" });
    });
  }, [zero, toast]);

  // Get all unique tags
  const allTags = Array.from(new Set(snippets.flatMap(snippet => snippet.tags || []))).sort();

  // Filter snippets using FlexSearch and tags
  const filteredSnippets = useMemo(() => {
    let results = typedSnippets;

    // Apply text search using FlexSearch
    if (effectiveSearchText.trim()) {
      const searchResults = searchIndex.search(effectiveSearchText);
      results = searchResults.map(index => typedSnippets[index as number]);
    }

    // Apply tag filtering
    if (effectiveSelectedTags.length > 0) {
      results = results.filter(snippet => {
        const tags = snippet.tags || [];
        return effectiveFilterMode === "or" 
          ? effectiveSelectedTags.some(tag => tags.includes(tag))
          : effectiveSelectedTags.every(tag => tags.includes(tag));
      });
    }

    return results;
  }, [typedSnippets, effectiveSearchText, effectiveSelectedTags, effectiveFilterMode, searchIndex]);

  // Get available tags for "and" mode filtering
  const getAvailableTags = useMemo(() => {
    if (effectiveFilterMode === "or" || effectiveSelectedTags.length === 0) {
      return allTags;
    }

    let baseSnippets = typedSnippets;

    if (effectiveSearchText.trim()) {
      const searchResults = searchIndex.search(effectiveSearchText);
      baseSnippets = searchResults.map(index => typedSnippets[index as number]);
    }
    
    const snippetsWithSelectedTags = baseSnippets.filter(snippet => {
      const tags = snippet.tags || [];
      return effectiveSelectedTags.every(tag => tags.includes(tag));
    });
    
    return Array.from(new Set(
      snippetsWithSelectedTags.flatMap(snippet => snippet.tags || [])
    )).sort();
  }, [effectiveFilterMode, effectiveSelectedTags, allTags, typedSnippets, effectiveSearchText, searchIndex]);

  return (
    <ControlPanel
      addNewSnippet={addNewSnippet}
      setShowTagManager={setShowTagManager}
      searchText={effectiveSearchText}
      setSearchText={handleSearchTextChange}
      selectedTags={effectiveSelectedTags}
      setSelectedTags={handleSelectedTagsChange}
      filterMode={effectiveFilterMode}
      setFilterMode={handleFilterModeChange}
      availableTags={getAvailableTags}
      onSearchSubmit={onSearchSubmit}
      filteredSnippetsCount={filteredSnippets.length}
      totalSnippetsCount={snippets.length}
    />
  );
};

export default SidebarControlPanel;