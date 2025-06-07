
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchAndFilterProps {
  searchText: string;
  setSearchText: (text: string) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[]) => void;
  filterMode: "and" | "or";
  setFilterMode: (mode: "and" | "or") => void;
  availableTags: string[];
  onSearchSubmit?: () => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchText,
  setSearchText,
  selectedTags,
  setSelectedTags,
  filterMode,
  setFilterMode,
  availableTags,
  onSearchSubmit,
}) => {
  const [tagFilterOpen, setTagFilterOpen] = useState(false);

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

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSearchSubmit) {
      onSearchSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search snippets... (Press Enter to save to history)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 justify-between min-w-[120px]">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Tags ({selectedTags.length})
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    <div className="flex items-center justify-between p-2 border-b">
                      <h4 className="font-medium">Filter Mode</h4>
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
                    {availableTags.map(tag => (
                      <CommandItem
                        key={tag}
                        onSelect={() => toggleTag(tag)}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                        />
                        <span className="flex-1">{tag}</span>
                        {selectedTags.includes(tag) && (
                          <Check className="h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
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
