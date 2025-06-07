import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Copy, Edit, Delete, Tag, Plus, X, Check, ChevronsUpDown } from "lucide-react";
import { Snippet } from "@/types/snippet";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SnippetItemProps {
  snippet: Snippet;
  onUpdate: (snippet: Snippet) => void;
  onDelete: (id: number) => void;
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
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

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

  const addTag = (tagName: string) => {
    if (tagName.trim() && !snippet.tags.includes(tagName.trim())) {
      onUpdate({
        ...snippet,
        tags: [...snippet.tags, tagName.trim()],
        updated_at: new Date().toISOString(),
      });
    }
    setTagPickerOpen(false);
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

  const availableTagsToAdd = allTags.filter(tag => !snippet.tags.includes(tag));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex gap-4 h-48">
        {/* Left side - Snippet body */}
        <div className="flex-1 space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Snippet</div>
          {isEditing ? (
            <div className="space-y-2 h-full flex flex-col">
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter your snippet here..."
                className="flex-1 resize-none"
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
            <div className="font-mono text-sm whitespace-pre-wrap bg-muted p-3 rounded border h-full overflow-auto">
              {snippet.body || "Empty snippet"}
            </div>
          )}
        </div>

        {/* Right side - Tags and metadata */}
        <div className="w-80 space-y-4 border-l pl-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Tag className="w-3 h-3" />
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
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
            
            <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  role="combobox"
                  aria-expanded={tagPickerOpen}
                  className="justify-between"
                >
                  Add tag...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search or create tag..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const input = document.querySelector('[cmdk-input]') as HTMLInputElement;
                            if (input?.value) {
                              addTag(input.value);
                            }
                          }}
                          className="w-full"
                        >
                          Create "{(document.querySelector('[cmdk-input]') as HTMLInputElement)?.value || ''}"
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {availableTagsToAdd.map((tag) => (
                        <CommandItem
                          key={tag}
                          onSelect={() => addTag(tag)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              "opacity-0"
                            )}
                          />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

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
      </div>
    </Card>
  );
};

export default SnippetItem;
