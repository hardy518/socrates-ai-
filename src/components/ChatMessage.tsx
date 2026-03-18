import { Message } from "@/types/chat";
import { FileIcon, ThumbsUp, ThumbsDown, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./ui/CopyButton";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  isDirectMode?: boolean;
  isLast?: boolean;
  onFeedback?: (feedback: 'like' | 'dislike') => void;
  className?: string;
}

export function ChatMessage({ message, isDirectMode, isLast, onFeedback, className }: ChatMessageProps) {
  const isUser = message.role === "user";

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={cn(`flex ${isUser ? "justify-end" : "justify-start"}`, className || "mb-6")}>
      {isUser ? (
        // 유저 메시지 - 말풍선
        <div className="flex flex-col items-end max-w-[80%] group/user">
          <div className="w-fit bg-[#F0F0F0] text-black rounded-2xl rounded-br-md px-4 py-3 shadow-sm border border-black/5">
            {message.files && message.files.length > 0 && (
              <div className="space-y-2 mb-3">
                {message.files.map(file => (
                  <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/5 text-black">
                    {file.type.startsWith('image/') ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="max-w-full h-auto rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(file.url, '_blank')}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-8 h-8 bg-background rounded">
                          <FileIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{file.name}</p>
                          <p className="text-xs opacity-70">{formatFileSize(file.size)}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {message.content && (
              <p className="text-base whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          
          {message.content && (
            <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover/user:opacity-100 transition-opacity pr-1">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  toast.success("메시지가 복사되었습니다.");
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all flex items-center justify-center"
                title="복사"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        // AI 메시지 - 말풍선 없이 텍스트만 (단, 즉답 모드이고 마지막 메시지일 경우 정답 UI 스타일 적용)
        <div className={`${isDirectMode ? "w-full" : "max-w-[80%]"} group relative`}>
          {message.files && message.files.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.files.map(file => (
                <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="max-w-full h-auto rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(file.url, '_blank')}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-8 h-8 bg-background rounded">
                        <FileIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs opacity-70">{formatFileSize(file.size)}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {message.content && (
            isDirectMode ? (
              <div className="bg-secondary/30 rounded-xl p-5 space-y-3 border border-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 group/answer relative w-full">
                <div className="sticky top-0 z-10 flex items-center justify-between text-primary mb-2 bg-secondary/80 backdrop-blur-sm -mx-2 px-2 py-1 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">해결 방향</span>
                  </div>
                  <CopyButton
                    content={message.content}
                    className="bg-background/50 hover:bg-accent text-accent-foreground shadow-sm"
                  />
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  <div className="prose-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="prose-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      toast.success("메시지가 복사되었습니다.");
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 hover:text-foreground transition-all"
                    title="복사"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-black/10 mx-0.5" />
                  <button
                    onClick={() => onFeedback?.('like')}
                    className={`p-1.5 rounded-lg transition-all ${message.feedback === 'like' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'}`}
                    title="좋아요"
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${message.feedback === 'like' ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => onFeedback?.('dislike')}
                    className={`p-1.5 rounded-lg transition-all ${message.feedback === 'dislike' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'}`}
                    title="싫어요"
                  >
                    <ThumbsDown className={`w-3.5 h-3.5 ${message.feedback === 'dislike' ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}