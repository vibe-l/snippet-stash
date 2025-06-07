
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, Edit, Delete, Tag, Plus, X } from "lucide-react";
import { Snippet } from "@/types/snippet";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface SnippetItemProps {
  snippet: Snippet;
  onUpdate: (snippet: Snippet) => void;
  onDelete: (id: string) => void;
  onCopy: (snippet: Snippet) => void;
  allTags: string[];
}

const SnippetItem: React.FC<SnippetItemProps> = ({
  snippet,
  onUpdate,
  onDelete,
  onCopy,
  allTags,
}) => {
  const [isEditing, setIsEditing] = useState(snippet.body === "");
  const [editedBody, setEditedBody] = useState(snippet.body);
  const [newTag, setNewTag] = useState("");

  const handleSave = () => {
    onUpdate({
      ...snippet,
      body: editedBody,
      updated_at: new Date().toISOString(),
    });
    setIsEditing(false);
    if (snippet.body === "" && editedBody !== "") {
      toast({
        title: "Snippet created",
        description: "Your new snippet has been saved.",
      });
    } else {
      toast({
        title: "Snippet updated",
        description: "Your changes have been saved.",
      });
    }
  };

  const handleCancel = () => {
    if (snippet.body === "") {
      onDelete(snippet.id);
    } else {
      setEditedBody(snippet.body);
      setIsEditing(false);
    }
  };

  const handleCopy = () => {
    onCopy(snippet);
    toast({
      title: "Copied to clipboard",
      description: "Snippet body has been copied to your clipboard.",
    });
  };

  const addTag = () => {
    if (newTag.trim() && !snippet.tags.includes(newTag.trim())) {
      onUpdate({
        ...snippet,
        tags: [...snippet.tags, newTag.trim()],
        updated_at: new Date().toISOString(),
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onUpdate({
      ...snippet,
      tags: snippet.tags.filter(tag => tag !== tagToRemove),
      updated_at: new Date().toISOString(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTag();
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter your snippet here..."
              className="min-h-20 resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <div className="text-xs text-muted-foreground flex items-center ml-auto">
                Ctrl+Enter to save, Esc to cancel
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="font-mono text-sm whitespace-pre-wrap bg-muted p-3 rounded border min-h-12">
              {snippet.body || "Empty snippet"}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Tag className="w-3 h-3" />
              Tags:
            </div>
            {snippet.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2 items-center">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyPress}
              placeholder="Add tag..."
              className="flex-1 max-w-xs"
              size={newTag.length || 10}
            />
            <Button size="sm" variant="outline" onClick={addTag} disabled={!newTag.trim()}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {formatDistanceToNow(new Date(snippet.created_at), { addSuffix: true })}</div>
          <div>Updated: {formatDistanceToNow(new Date(snippet.updated_at), { addSuffix: true })}</div>
          {snippet.used_at && (
            <div>Used: {formatDistanceToNow(new Date(snippet.used_at), { addSuffix: true })}</div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!snippet.body.trim()}
          >
            <Copy className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isEditing}
          >
            <Edit className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Delete className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Snippet</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this snippet? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(snippet.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};

export default SnippetItem;
