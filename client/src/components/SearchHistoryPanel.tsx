
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
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";

interface SearchHistoryPanelProps {
  onRestoreSearch: (entry: SearchHistoryEntry) => void;
}

const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({ onRestoreSearch }) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Fetch search history from database
  const { data: history = [], refetch } = trpc.searchHistory.getSearchHistory.useQuery();

  // Delete search history entry mutation
  const deleteEntryMutation = trpc.searchHistory.deleteSearchHistory.useMutation({
    onSuccess: () => {
      utils.searchHistory.getSearchHistory.invalidate();
      toast({ title: "Search history entry deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete search history entry", variant: "destructive" });
    }
  });

  // Clear all search history mutation
  const clearAllMutation = trpc.searchHistory.clearSearchHistory.useMutation({
    onSuccess: () => {
      utils.searchHistory.getSearchHistory.invalidate();
      toast({ title: "Search history cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear search history", variant: "destructive" });
    }
  });

  React.useEffect(() => {
    // Listen for a custom event to refresh when same-tab changes occur
    const handleRefresh = () => {
      refetch();
    };
    
    window.addEventListener("searchHistoryRefresh", handleRefresh);
    
    return () => {
      window.removeEventListener("searchHistoryRefresh", handleRefresh);
    };
  }, [refetch]);

  const handleDeleteEntry = (entryId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEntryMutation.mutate({ id: entryId }); // Changed to object with id
  };

  const handleClearAll = () => {
    clearAllMutation.mutate(); // No change needed here
  };

  const handleRestoreSearch = (entry: SearchHistoryEntry) => {
    onRestoreSearch(entry);
    // Note: The backend will handle score updates when history entries are used
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
              {history.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No search history yet.</p>
                  <p className="text-xs mt-1">Your searches will appear here.</p>
                </div>
              ) : (
                history.map((entry) => (
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
