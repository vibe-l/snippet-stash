
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import SearchAndFilter from "./SearchAndFilter";
import SnippetList from "./SnippetList";
import TagManager from "./TagManager";
import { loadSnippets, saveSnippets, createExampleSnippets } from "@/utils/snippetStorage";
import { Snippet } from "@/types/snippet";
import FlexSearch from "flexsearch";

const SnippetManager = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<"and" | "or">("or");
  const [showTagManager, setShowTagManager] = useState(false);

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

  useEffect(() => {
    const loadedSnippets = loadSnippets();
    if (loadedSnippets.length === 0) {
      const exampleSnippets = createExampleSnippets();
      setSnippets(exampleSnippets);
      saveSnippets(exampleSnippets);
    } else {
      setSnippets(loadedSnippets);
    }
  }, []);

  const addNewSnippet = () => {
    const newSnippet: Snippet = {
      id: Date.now().toString(),
      body: "",
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      used_at: null,
    };
    const updatedSnippets = [newSnippet, ...snippets];
    setSnippets(updatedSnippets);
    saveSnippets(updatedSnippets);
  };

  const updateSnippet = (updatedSnippet: Snippet) => {
    const updatedSnippets = snippets.map(snippet =>
      snippet.id === updatedSnippet.id ? updatedSnippet : snippet
    );
    setSnippets(updatedSnippets);
    saveSnippets(updatedSnippets);
  };

  const deleteSnippet = (id: string) => {
    const updatedSnippets = snippets.filter(snippet => snippet.id !== id);
    setSnippets(updatedSnippets);
    saveSnippets(updatedSnippets);
  };

  const copySnippet = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.body);
    const updatedSnippet = {
      ...snippet,
      used_at: new Date().toISOString(),
    };
    updateSnippet(updatedSnippet);
  };

  const renameTag = (oldTag: string, newTag: string) => {
    const updatedSnippets = snippets.map(snippet => ({
      ...snippet,
      tags: snippet.tags.map(tag => tag === oldTag ? newTag : tag),
      updated_at: snippet.tags.includes(oldTag) ? new Date().toISOString() : snippet.updated_at,
    }));
    setSnippets(updatedSnippets);
    saveSnippets(updatedSnippets);

    // Update selected tags
    setSelectedTags(tags => tags.map(tag => tag === oldTag ? newTag : tag));
  };

  const deleteTag = (tagToDelete: string) => {
    const updatedSnippets = snippets.map(snippet => ({
      ...snippet,
      tags: snippet.tags.filter(tag => tag !== tagToDelete),
      updated_at: snippet.tags.includes(tagToDelete) ? new Date().toISOString() : snippet.updated_at,
    }));
    setSnippets(updatedSnippets);
    saveSnippets(updatedSnippets);

    // Remove from selected tags
    setSelectedTags(tags => tags.filter(tag => tag !== tagToDelete));
  };

  // Get all unique tags
  const allTags = Array.from(new Set(snippets.flatMap(snippet => snippet.tags))).sort();

  // Filter snippets using FlexSearch and tags
  const filteredSnippets = useMemo(() => {
    let results = snippets;

    // Apply text search using FlexSearch
    if (searchText.trim()) {
      const searchResults = searchIndex.search(searchText);
      results = searchResults.map(index => snippets[index as number]);
    }

    // Apply tag filtering
    if (selectedTags.length > 0) {
      results = results.filter(snippet => {
        return filterMode === "or" 
          ? selectedTags.some(tag => snippet.tags.includes(tag))
          : selectedTags.every(tag => snippet.tags.includes(tag));
      });
    }

    return results;
  }, [snippets, searchText, selectedTags, filterMode, searchIndex]);

  // Get available tags for "and" mode filtering
  const getAvailableTags = () => {
    if (filterMode === "or" || selectedTags.length === 0) {
      return allTags;
    }
    
    // In "and" mode, only show tags that appear together with currently selected tags
    const snippetsWithSelectedTags = snippets.filter(snippet =>
      selectedTags.every(tag => snippet.tags.includes(tag))
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
            <Button onClick={addNewSnippet} className="flex items-center gap-2">
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
          searchText={searchText}
          setSearchText={setSearchText}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          availableTags={getAvailableTags()}
        />
      </Card>

      <SnippetList
        snippets={filteredSnippets}
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
