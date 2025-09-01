import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import SearchAndFilter from "./SearchAndFilter";
import SnippetList from "./SnippetList";
import TagManager from "./TagManager";
import type { Snippet } from "@/lib/schema";
import FlexSearch from "flexsearch";
import { useToast } from "@/hooks/use-toast";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { nanoid } from "nanoid";

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
  const snippetsQuery = zero.query.snippets.orderBy("updated_at", "desc");
  const [snippets = [], snippetsResult] = useQuery(snippetsQuery);
  const typedSnippets = snippets as Snippet[];
  const isLoading = snippetsResult.type !== "complete";

  // Create FlexSearch index
  const searchIndex = useMemo(() => {
    const index = new FlexSearch.Index({
      tokenize: "forward",
      resolution: 9,
    });
    
    snippets.forEach((snippet, i) => {
      const searchableText = `${snippet.body} ${snippet.tags.join(" ")}`;
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
    zero.mutate.snippets.insert({
      id: snippetId,
      body: "",
      tags: [],
    }).then(() => {
      toast({ title: "Snippet created successfully" });
    }).catch(() => {
      toast({ title: "Failed to create snippet", variant: "destructive" });
    });
  };

  const updateSnippet = (updatedSnippet: Snippet) => {
    zero.mutate.snippets.update({
      id: updatedSnippet.id,
      body: updatedSnippet.body,
      tags: updatedSnippet.tags,
    }).client.then(() => {
      toast({ title: "Snippet updated successfully" });
    }).catch(() => {
      toast({ title: "Failed to update snippet", variant: "destructive" });
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
  const allTags = Array.from(new Set(snippets.flatMap(snippet => snippet.tags))).sort();

  // Filter snippets using FlexSearch and tags
  const filteredSnippets = useMemo(() => {
    let results = snippets;

    // Apply text search using FlexSearch
    if (effectiveSearchText.trim()) {
      const searchResults = searchIndex.search(effectiveSearchText);
      results = searchResults.map(index => snippets[index as number]);
    }

    // Apply tag filtering
    if (effectiveSelectedTags.length > 0) {
      results = results.filter(snippet => {
        return effectiveFilterMode === "or" 
          ? effectiveSelectedTags.some(tag => snippet.tags.includes(tag))
          : effectiveSelectedTags.every(tag => snippet.tags.includes(tag));
      });
    }

    return results;
  }, [snippets, effectiveSearchText, effectiveSelectedTags, effectiveFilterMode, searchIndex]);

  // Get available tags for "and" mode filtering
  const getAvailableTags = () => {
    if (effectiveFilterMode === "or" || effectiveSelectedTags.length === 0) {
      return allTags;
    }

    // In "and" mode, filter the list to show only tags that exist on snippets that
    // match both the currently selected tags AND the current search query.
    let baseSnippets = snippets;

    if (effectiveSearchText.trim()) {
      const searchResults = searchIndex.search(effectiveSearchText);
      baseSnippets = searchResults.map(index => snippets[index as number]);
    }
    
    const snippetsWithSelectedTags = baseSnippets.filter(snippet =>
      effectiveSelectedTags.every(tag => snippet.tags.includes(tag))
    );
    
    return Array.from(new Set(
      snippetsWithSelectedTags.flatMap(snippet => snippet.tags)
    )).sort();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button onClick={addNewSnippet} className="flex items-center gap-2" data-testid="add-new-snippet-button">
              <Plus className="w-4 h-4" />
              Add Snippet
            </Button>
            <Button variant="outline" onClick={() => setShowTagManager(true)}>
              Manage Tags
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredSnippets.length} of {snippets.length} snippets
          </div>
        </div>

        <SearchAndFilter
          searchText={effectiveSearchText}
          setSearchText={handleSearchTextChange}
          selectedTags={effectiveSelectedTags}
          setSelectedTags={handleSelectedTagsChange}
          filterMode={effectiveFilterMode}
          setFilterMode={handleFilterModeChange}
          availableTags={getAvailableTags()}
          onSearchSubmit={onSearchSubmit}
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
