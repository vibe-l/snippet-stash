
import React from "react";
import SnippetItem from "./SnippetItem";
import type { Snippet } from "@/lib/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface SnippetListProps {
  snippets: Snippet[];
  isLoading: boolean;
  onUpdate: (snippet: Snippet) => void;
  onDelete: (id: number) => void;
  onCopy: (snippet: Snippet) => void;
  allTags: string[];
}

const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  onUpdate,
  onDelete,
  onCopy,
  allTags,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (snippets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No snippets found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="snippet-list-container">
      {snippets.map(snippet => (
        <SnippetItem
          key={snippet.id}
          snippet={snippet}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCopy={onCopy}
          allTags={allTags}
        />
      ))}
    </div>
  );
};

export default SnippetList;
