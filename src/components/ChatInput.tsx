import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageFile } from "@/types/chat";

interface ChatInputProps {
  onSend: (message: string, files?: MessageFile[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  isLoading,
  disabled,
  placeholder = "이어서 생각해 볼까요?",
  autoFocus = false
}: ChatInputProps) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 로그아웃 시 입력창 초기화
  useEffect(() => {
    if (!user) {
      setInput("");
    }
  }, [user]);

  // autoFocus 처리
  useEffect(() => {
    if (autoFocus && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled || isLoading) return;

    onSend(input.trim(), undefined);
    setInput("");

    // 높이 초기화
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isValid = input.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex flex-col w-full bg-background border border-border rounded-xl shadow-sm transition-all shadow-input"
    >
      <div className="flex-1 min-h-[44px] max-h-32 overflow-y-auto scrollbar-thin">
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent border-0 resize-none px-4 py-3 focus:ring-0 focus:outline-none placeholder:text-muted-foreground/70 text-base"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          rows={1}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />
      </div>

      <div className="flex justify-end px-3 pb-3 pt-1">
        <Button
          type="submit"
          disabled={(!isValid && !isLoading) || (isLoading && !isValid && !disabled)}
          size="icon"
          className={`rounded-lg w-9 h-9 transition-all duration-200 ${isValid || isLoading
            ? "bg-primary text-primary-foreground opacity-100 scale-100 shadow-sm hover:bg-primary/90"
            : "bg-muted text-muted-foreground opacity-30 scale-95 pointer-events-none"
            }`}
        >
          {isLoading ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <ArrowUp className="w-5 h-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
