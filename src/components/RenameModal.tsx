import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => void;
  initialTitle: string;
}

export function RenameModal({ isOpen, onClose, onRename, initialTitle }: RenameModalProps) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(title.trim());
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">채팅 이름 변경</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="채팅 이름을 입력하세요"
            className="h-12 text-base rounded-xl border-primary/20 focus:ring-primary/20"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl font-medium text-muted-foreground"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="rounded-xl font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              이름 변경
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
