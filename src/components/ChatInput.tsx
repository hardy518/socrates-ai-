import { useState, useRef } from "react";
import { Send, Paperclip, X, FileIcon, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFile } from "@/types/chat";

interface ChatInputProps {
  onSend: (message: string, files?: MessageFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "메시지를 입력하세요..." }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<MessageFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: MessageFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setAttachedFiles(prev => [...prev, ...newFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || disabled) return;
    
    onSend(input.trim(), attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput("");
    setAttachedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <FileIcon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* File Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          {attachedFiles.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-2 bg-background rounded-md border border-border group hover:border-primary transition-colors"
            >
              {file.type.startsWith('image/') ? (
                <img 
                  src={file.url} 
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="flex items-center justify-center w-10 h-10 bg-muted rounded">
                  {getFileIcon(file.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(file.id)}
                className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="rounded-xl h-12 w-12 self-end shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          className="input-field flex-1 min-h-[48px] max-h-32"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        
        <Button 
          type="submit" 
          disabled={(!input.trim() && attachedFiles.length === 0) || disabled}
          className="rounded-xl px-4 h-12 self-end shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
