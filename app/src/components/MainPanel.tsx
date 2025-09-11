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
      <SidebarContent>
        <SidebarControlPanel
          externalSearchState={externalSearchState}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
        />
        <SearchHistoryPanel onRestoreSearch={onRestoreSearch} />
      </SidebarContent>
  );
};

export default MainPanel;