
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
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { Trash2, Search, Clock } from "lucide-react";
import { SearchHistory } from "@/lib/schema";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useZero, useQuery } from "@rocicorp/zero/react";

interface SearchHistoryPanelProps {
  onRestoreSearch: (entry: SearchHistory) => void;
}

const SearchHistoryPanel: React.FC<SearchHistoryPanelProps> = ({ onRestoreSearch }) => {
  const { toast } = useToast();
  const { state } = useSidebar();
  const zero = useZero();

  // Fetch search history from database using Zero
  const historyQuery = zero.query.searchHistory.orderBy("score", "desc");
  const [history = []] = useQuery(historyQuery);

  const handleDeleteEntry = (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    zero.mutate.searchHistory.delete({ id: entryId }).then(() => {
      toast({ title: "Search history entry deleted" });
    }).catch(() => {
      toast({ title: "Failed to delete search history entry", variant: "destructive" });
    });
  };

  const handleClearAll = async () => {
    try {
      // Delete all search history entries one by one
      // This is not optimal but works with the basic mutators
      for (const entry of history) {
        await zero.mutate.searchHistory.delete({ id: entry.id });
      }
      toast({ title: "Search history cleared" });
    } catch (error) {
      toast({ title: "Failed to clear search history", variant: "destructive" });
    }
  };

  const handleRestoreSearch = (entry: SearchHistory) => {
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
    <Sidebar collapsible="icon" className="border-r flex-shrink-0">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="font-semibold">Search History</span>
          </div>
          {history.length > 0 && (
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
                    {state === "expanded" ? (
                      <Card
                        className="p-3 cursor-pointer hover:bg-accent transition-colors w-full"
                        onClick={() => handleRestoreSearch(entry as SearchHistory)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {entry.query && (
                                <p className="text-sm font-medium truncate">
                                  "{entry.query}"
                                </p>
                              )}
                              {entry.selected_tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {entry.selected_tags.map((tag: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  <Badge variant="outline" className="text-xs">
                                    {entry.filter_mode.toUpperCase()}
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
                      </Card>
                    ) : (
                      <SidebarMenuButton
                        onClick={() => handleRestoreSearch(entry as SearchHistory)}
                        tooltip={{children: entry.query || entry.selected_tags.join(', ')}}
                      >
                        <Search />
                      </SidebarMenuButton>
                    )}
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
