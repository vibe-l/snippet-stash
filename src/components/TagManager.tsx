
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TagManagerProps {
  tags: string[];
  onRename: (oldTag: string, newTag: string) => void;
  onClose: () => void;
}

const TagManager: React.FC<TagManagerProps> = ({ tags, onRename, onClose }) => {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const saveEdit = () => {
    if (editingTag && editValue.trim() && editValue !== editingTag) {
      if (tags.includes(editValue.trim()) && editValue.trim() !== editingTag) {
        toast({
          title: "Tag already exists",
          description: "A tag with this name already exists.",
          variant: "destructive",
        });
        return;
      }
      onRename(editingTag, editValue.trim());
      toast({
        title: "Tag renamed",
        description: `Tag "${editingTag}" has been renamed to "${editValue.trim()}".`,
      });
    }
    setEditingTag(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setEditValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No tags found</p>
          ) : (
            tags.map(tag => (
              <div key={tag} className="flex items-center gap-2 p-2 border rounded">
                {editingTag === tag ? (
                  <>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="flex-1">{tag}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(tag)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagManager;
