import React from "react";
import { 
  SidebarContent, 
  SidebarHeader
} from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import SearchHistoryPanel from "./SearchHistoryPanel";
import SidebarControlPanel from "./SidebarControlPanel";
import type { SearchHistory } from "@/lib/schema";

interface MainPanelProps {
  onRestoreSearch: (entry: SearchHistory) => void;
  externalSearchState?: {
    searchText: string;
    selectedTags: string[];
    filterMode: "and" | "or";
  };
  onSearchChange?: (searchText: string, selectedTags: string[], filterMode: "and" | "or") => void;
  onSearchSubmit?: () => void;
}

const MainPanel: React.FC<MainPanelProps> = ({ 
  onRestoreSearch,
  externalSearchState,
  onSearchChange,
  onSearchSubmit,
}) => {
  return (
    <>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Menu className="w-4 h-4" />
            <span className="font-semibold">Panel</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarControlPanel
          externalSearchState={externalSearchState}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
        />
        <SearchHistoryPanel onRestoreSearch={onRestoreSearch} />
      </SidebarContent>
    </>
  );
};

export default MainPanel;