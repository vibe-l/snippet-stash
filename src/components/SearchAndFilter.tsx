
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";

interface SearchAndFilterProps {
  searchText: string;
  setSearchText: (text: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  filterMode: "and" | "or";
  setFilterMode: (mode: "and" | "or") => void;
  availableTags: string[];
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchText,
  setSearchText,
  selectedTags,
  setSelectedTags,
  filterMode,
  setFilterMode,
  availableTags,
}) => {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchText("");
    setSelectedTags([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search snippets..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Tags ({selectedTags.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter by Tags</h4>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={filterMode === "or" ? "default" : "outline"}
                      onClick={() => setFilterMode("or")}
                    >
                      OR
                    </Button>
                    <Button
                      size="sm"
                      variant={filterMode === "and" ? "default" : "outline"}
                      onClick={() => setFilterMode("and")}
                    >
                      AND
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {availableTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag}
                        checked={selectedTags.includes(tag)}
                        onCheckedChange={() => toggleTag(tag)}
                      />
                      <label htmlFor={tag} className="text-sm cursor-pointer flex-1">
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {(searchText || selectedTags.length > 0) && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          {selectedTags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => toggleTag(tag)}
              />
            </Badge>
          ))}
          <Badge variant="outline" className="text-xs">
            {filterMode.toUpperCase()}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;
