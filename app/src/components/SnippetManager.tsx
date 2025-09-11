import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import SnippetList from "./SnippetList";
import TagManager from "./TagManager";
import ControlPanel from "./ControlPanel";
import type { Snippet } from "@/lib/zero-schema.gen";
import FlexSearch from "flexsearch";
import { useToast } from "@/hooks/use-toast";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { nanoid } from "nanoid";
import { mySnippets } from "@/lib/syncedQueries";

interface SnippetManagerProps {
  externalSearchState?: {
    searchText: string;
    selectedTags: string[];
    filterMode: "and" | "or";
  };
  onSearchChange?: (searchText: string, selectedTags: string[], filterMode: "and" | "or") => void;
  onSearchSubmit?: () => void;
}

const SnippetManager: React.FC<SnippetManagerProps> = ({ 
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
  // const snippetsQuery = zero.query.snippets.orderBy("updated_at", "desc");
  const [snippets = [], snippetsResult] = useQuery(mySnippets(1));
  const typedSnippets = snippets as Snippet[];
  const isLoading = snippetsResult.type !== "complete";

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

  const handleSearchTextChange = (newSearchText: string) => {
    setSearchText(newSearchText);
    if (onSearchChange) {
      onSearchChange(newSearchText, effectiveSelectedTags, effectiveFilterMode);
    }
  };

  const handleSelectedTagsChange = (newSelectedTags: string[]) => {
    setSelectedTags(newSelectedTags);
    if (onSearchChange) {
      onSearchChange(effectiveSearchText, newSelectedTags, effectiveFilterMode);
    }
  };

  const handleFilterModeChange = (newFilterMode: "and" | "or") => {
    setFilterMode(newFilterMode);
    if (onSearchChange) {
      onSearchChange(effectiveSearchText, effectiveSelectedTags, newFilterMode);
    }
  };

  const addNewSnippet = () => {
    // Generate a unique ID using nanoid
    const snippetId = nanoid();
    const now = new Date();
    zero.mutate.snippets.insert({
      id: snippetId,
      body: "",
      tags: [],
      author_id: 1, // Using hardcoded author_id for anonymous user
      created_at: now,
      updated_at: now,
    }).then(() => {
      toast({ title: "Snippet created successfully" });
    }).catch(() => {
      toast({ title: "Failed to create snippet", variant: "destructive" });
    });
  };

  const updateSnippet = (updatedSnippet: Snippet) => {
    zero.mutate.updateSnippet({
      id: updatedSnippet.id,
      body: updatedSnippet.body,
      tags: updatedSnippet.tags,
    });
  };

  const deleteSnippet = (id: string) => {
    zero.mutate.snippets.delete({ id }).then(() => {
      toast({ title: "Snippet deleted successfully" });
    }).catch(() => {
      toast({ title: "Failed to delete snippet", variant: "destructive" });
    });
  };

  const copySnippet = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.body);
    zero.mutate.snippets.update({ id: snippet.id, used_at: new Date() });
    toast({ title: "Snippet copied to clipboard" });
  };

  const renameTag = (oldTag: string, newTag: string) => {
    // Update all snippets that contain the old tag
    typedSnippets.forEach(snippet => {
      if (snippet.tags.includes(oldTag)) {
        const updatedTags = snippet.tags.map((tag: string) => (tag === oldTag ? newTag : tag));
        zero.mutate.snippets.update({
          id: snippet.id,
          body: snippet.body,
          tags: updatedTags,
        });
      }
    });

    // Update selected tags
    setSelectedTags(tags => tags.map(tag => (tag === oldTag ? newTag : tag)));
  };

  const deleteTag = (tagToDelete: string) => {
    // Update all snippets that contain the tag
    typedSnippets.forEach(snippet => {
      if (snippet.tags.includes(tagToDelete)) {
        const updatedTags = snippet.tags.filter((tag: string) => tag !== tagToDelete);
        zero.mutate.snippets.update({
          id: snippet.id,
          body: snippet.body,
          tags: updatedTags,
        });
      }
    });

    // Remove from selected tags
    setSelectedTags(tags => tags.filter(tag => tag !== tagToDelete));
  };

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
  const getAvailableTags = () => {
    if (effectiveFilterMode === "or" || effectiveSelectedTags.length === 0) {
      return allTags;
    }

    // In "and" mode, filter the list to show only tags that exist on snippets that
    // match both the currently selected tags AND the current search query.
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
  };

  return (
    <div className="space-y-6">
      <Card>
        <ControlPanel
          addNewSnippet={addNewSnippet}
          setShowTagManager={setShowTagManager}
          searchText={effectiveSearchText}
          setSearchText={handleSearchTextChange}
          selectedTags={effectiveSelectedTags}
          setSelectedTags={handleSelectedTagsChange}
          filterMode={effectiveFilterMode}
          setFilterMode={handleFilterModeChange}
          availableTags={getAvailableTags()}
          onSearchSubmit={onSearchSubmit}
          filteredSnippetsCount={filteredSnippets.length}
          totalSnippetsCount={snippets.length}
        />
      </Card>

      <SnippetList
        snippets={filteredSnippets}
        isLoading={isLoading}
        onUpdate={updateSnippet}
        onDelete={deleteSnippet}
        onCopy={copySnippet}
        allTags={allTags}
      />

      {showTagManager && (
        <TagManager
          tags={allTags}
          onRename={renameTag}
          onDelete={deleteTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
};

export default SnippetManager;