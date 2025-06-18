import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { TutorNote } from "@/hooks/useTutorNotes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./SavedNote.css";

interface SavedNoteProps {
  note: TutorNote;
  onDelete: (id: string) => void;
}

export const SavedNote = ({ note, onDelete }: SavedNoteProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <>
      <button 
        type="button"
        className="w-full border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors text-left group cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsDialogOpen(true);
          }
        }}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="w-full">
              <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{note.prompt}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-destructive/20"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            aria-label="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
          <p className="whitespace-pre-wrap line-clamp-3">
            {note.response}
          </p>
        </div>
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{note.prompt}</DialogTitle>
            <div className="text-xs text-muted-foreground">
              {new Date(note.created_at).toLocaleString()}
            </div>
          </DialogHeader>
          <div className="mt-4 text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
            {note.response}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
