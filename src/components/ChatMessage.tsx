import { Message } from "@/types/chat";
import { FileIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./ui/CopyButton";

interface ChatMessageProps {
  message: Message;
  isDirectMode?: boolean;
  isLast?: boolean;
}

export function ChatMessage({ message, isDirectMode, isLast }: ChatMessageProps) {
  const isUser = message.role === "user";

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      {isUser ? (
        // 유저 메시지 - 말풍선
        <div className="max-w-[80%] bg-secondary rounded-2xl rounded-br-md px-4 py-3">
          {message.files && message.files.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.files.map(file => (
                <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
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
                <div className="flex items-center justify-between text-primary mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">해결 방향</span>
                  </div>
                  <CopyButton
                    content={message.content}
                    className="bg-background/50 hover:bg-accent text-accent-foreground"
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
                <CopyButton
                  content={message.content}
                  className="absolute top-0 -right-12 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}