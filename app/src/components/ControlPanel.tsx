
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SearchAndFilter from "./SearchAndFilter";

interface ControlPanelProps {
  addNewSnippet: () => void;
  setShowTagManager: (show: boolean) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  filterMode: "and" | "or";
  setFilterMode: (mode: "and" | "or") => void;
  availableTags: string[];
  onSearchSubmit?: () => void;
  filteredSnippetsCount: number;
  totalSnippetsCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  addNewSnippet,
  setShowTagManager,
  searchText,
  setSearchText,
  selectedTags,
  setSelectedTags,
  filterMode,
  setFilterMode,
  availableTags,
  onSearchSubmit,
  filteredSnippetsCount,
  totalSnippetsCount,
}) => {
  return (
    <div className="p-6">
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
          {filteredSnippetsCount} of {totalSnippetsCount} snippets
        </div>
      </div>

      <SearchAndFilter
        searchText={searchText}
        setSearchText={setSearchText}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        availableTags={availableTags}
        onSearchSubmit={onSearchSubmit}
      />
    </div>
  );
};

export default ControlPanel;
