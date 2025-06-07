
import React from "react";
import SnippetItem from "./SnippetItem";
import { Snippet } from "@/types/snippet";

interface SnippetListProps {
  snippets: Snippet[];
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
}) => {
  if (snippets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No snippets found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
