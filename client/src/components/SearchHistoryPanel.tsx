
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar";
import { Trash2, Search, Clock } from "lucide-react";
import { SearchHistoryEntry } from "@/types/searchHistory";
import { loadSearchHistory, deleteSearchHistoryEntry, clearSearchHistory } from "@/utils/searchHistoryStorage";
import { formatDistanceToNow } from "date-fns";

interface SearchHistoryPanelProps {
  onRestoreSearch: (entry: SearchHistoryEntry) => void;
}

const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({ onRestoreSearch }) => {
  const [history, setHistory] = React.useState(loadSearchHistory());

  const refreshHistory = () => {
    setHistory(loadSearchHistory());
  };

  React.useEffect(() => {
    // Refresh on mount
    refreshHistory();
    
    // Listen for storage changes to refresh history
    const handleStorageChange = () => {
      refreshHistory();
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for a custom event to refresh when same-tab changes occur
    const handleRefresh = () => {
      refreshHistory();
    };
    
    window.addEventListener("searchHistoryRefresh", handleRefresh);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("searchHistoryRefresh", handleRefresh);
    };
  }, []);

  const handleDeleteEntry = (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSearchHistoryEntry(entryId);
    refreshHistory();
  };

  const handleClearAll = () => {
    clearSearchHistory();
    refreshHistory();
  };

  const handleRestoreSearch = (entry: SearchHistoryEntry) => {
    onRestoreSearch(entry);
    refreshHistory(); // Refresh to show updated scores
  };

  const formatLastUsed = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  return (
    <Sidebar className="w-80 border-r">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="font-semibold">Search History</span>
          </div>
          {history.entries.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Searches</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {history.entries.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No search history yet.</p>
                  <p className="text-xs mt-1">Your searches will appear here.</p>
                </div>
              ) : (
                history.entries.map((entry) => (
                  <SidebarMenuItem key={entry.id}>
                    <Card className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <SidebarMenuButton 
                        asChild
                        className="w-full h-auto p-0"
                      >
                        <div 
                          onClick={() => handleRestoreSearch(entry)}
                          className="space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {entry.query && (
                                <p className="text-sm font-medium truncate">
                                  "{entry.query}"
                                </p>
                              )}
                              {entry.selectedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {entry.selectedTags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  <Badge variant="outline" className="text-xs">
                                    {entry.filterMode.toUpperCase()}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteEntry(entry.id, e)}
                              className="h-6 w-6 p-0 shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Score: {entry.score}</span>
                            <span>{formatLastUsed(entry.last_used_at)}</span>
                          </div>
                        </div>
                      </SidebarMenuButton>
                    </Card>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default SearchHistoryPanel;
