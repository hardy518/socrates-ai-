import { useEffect, useRef, useState } from "react";
import { Lightbulb, Terminal, Share2, Copy, Menu } from "lucide-react";
import { toast } from "sonner";
import { ChatSession, MessageFile } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { GrowthGauge } from "./GrowthGauge";
import { generateAIResponse, generateFinalAnswer } from "@/lib/claude";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { CopyButton } from "./ui/CopyButton";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  session: ChatSession;
  /** 유저가 보낸 메시지용 */
  onSendMessage: (content: string, files?: MessageFile[]) => void;
  /** AI가 보낸 메시지용 */
  onSendAIMessage: (content: string) => void;
  onResolve: () => void;
  isInitialLoading?: boolean;
  onMenuClick?: () => void;
  onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void;
  onUpdateTitle?: (sessionId: string, title: string) => void;
  onUpdateProblem?: (sessionId: string, problem: string) => void;
}

export function ChatView({ session, onSendMessage, onSendAIMessage, onResolve, isInitialLoading, onMenuClick, onFeedback, onUpdateTitle, onUpdateProblem }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [showEarlyComplete, setShowEarlyComplete] = useState(false);
  const [isEditingProblem, setIsEditingProblem] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();


  const handleCopyAll = async () => {
    try {
      const formattedChat = session.messages
        .filter(m => m.content !== "ANSWER_REQUEST_CMD")
        .map(m => {
          const role = m.role === "user" ? "User" : "AI";
          return `[${role}]\n${m.content}`;
        })
        .join("\n\n");

      const finalContent = session.isResolved && finalAnswer
        ? `${formattedChat}\n\n[해결 방향]\n${finalAnswer}`
        : formattedChat;

      await navigator.clipboard.writeText(finalContent);
      toast.success("전체 대화 내용이 복사되었습니다.");
    } catch (err) {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      if (navigator.share) {
        await navigator.share({
          title: session.title || "Socrates AI Chat",
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("링크가 클립보드에 복사되었습니다.");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error("공유에 실패했습니다.");
      }
    }
  };

  const isComplete = showEarlyComplete || session.currentStep >= session.depth;
  const canViewAnswer = isComplete && !session.isResolved;

  const lastMessage = session.messages[session.messages.length - 1];
  const needsVerification = lastMessage?.role === 'assistant' && lastMessage.content.includes('[VERIFICATION_NEEDED]');

  // Quick Replies 조건
  const assistantCount = session.messages.filter(m => m.role === 'assistant').length;
  const showQuickReplies = assistantCount >= 6 && 
                          lastMessage?.role === 'assistant' && 
                          !isLoading && 
                          !showAnswer && 
                          !session.isResolved;

  // 로컬스토리지에서 정답 상태 복원
  useEffect(() => {
    if (session.id) {
      const savedAnswer = localStorage.getItem(`answer_${session.id}`);
      const savedShowAnswer = localStorage.getItem(`showAnswer_${session.id}`);
      const savedEarlyComplete = localStorage.getItem(`earlyComplete_${session.id}`);

      // 세션 전환 시 명시적으로 초기화 (값이 없으면 null/false로 설정)
      setFinalAnswer(savedAnswer || null);
      setShowAnswer(savedShowAnswer === 'true');
      setShowEarlyComplete(savedEarlyComplete === 'true');
    }
  }, [session.id]);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [session.messages, isLoading, isInitialLoading, showAnswer, isLoadingAnswer, isEditingProblem]);

  const handleSend = async (content: string, files?: MessageFile[]) => {
    let messageContent = content;

    // 수정 모드일 때 메시지 내용 변경
    if (isEditingProblem) {
      messageContent = `[문제 수정] ${content}\n\n위 내용으로 문제를 수정하고 소크라테스식 대화를 시작해주세요.`;
      setIsEditingProblem(false);
    }

    if ((!session.problem || session.problem.trim() === "") && onUpdateProblem) {
      onUpdateProblem(session.id, content);
    }
    
    // 1) 유저 메시지 저장
    onSendMessage(messageContent, files);
    setIsLoading(true);
    setError(null);

    try {
      const aiResponse = await generateAIResponse(session, messageContent, files);

      // [ANSWER_FOUND] 감지
      if (aiResponse.startsWith('[ANSWER_FOUND]')) {
        const cleanResponse = aiResponse.replace('[ANSWER_FOUND]', '').trim();
        // 2) AI 메시지로 저장
        onSendAIMessage(cleanResponse);
        setShowEarlyComplete(true);

        // 로컬스토리지에 earlyComplete 상태 저장
        if (session.id) {
          localStorage.setItem(`earlyComplete_${session.id}`, 'true');
        }
      } else {
        onSendAIMessage(aiResponse);
      }

      // 4) 세션 제목이 비어있거나 대기 문구이면 AI에게 제목 생성 요청
      const isPlaceholderTitle = session.title === t('waitingForFirstMessage');
      if ((!session.title || session.title.trim() === "" || isPlaceholderTitle) && onUpdateTitle) {
        try {
          const titlePrompt = `방금 유저가 보낸 첫 메시지를 보고 10자 내외의 세션 제목을 만들어줘. TITLE: [제목] 형식으로만 응답해.
          
유저 메시지: ${messageContent}`;
          
          const titleResponse = await generateAIResponse(session, titlePrompt);
          const titleMatch = titleResponse.match(/TITLE:\s*(.+)/);
          
          if (titleMatch && titleMatch[1]) {
            const newTitle = titleMatch[1].trim();
            onUpdateTitle(session.id, newTitle);
          }
        } catch (titleErr) {
          console.error("제목 생성 실패:", titleErr);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "응답을 생성하는 중 오류가 발생했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyConfirm = async () => {
    const content = "네, 맞습니다. 시작해주세요.";
    await handleSend(content);
  };

  const handleVerifyEdit = () => {
    setIsEditingProblem(true);
  };

  const handleViewAnswer = async () => {
    setIsLoadingAnswer(true);
    setShowAnswer(true);

    try {
      const answer = await generateFinalAnswer(session);
      setFinalAnswer(answer);

      // 로컬스토리지에 정답 상태 저장
      if (session.id) {
        localStorage.setItem(`answer_${session.id}`, answer);
        localStorage.setItem(`showAnswer_${session.id}`, 'true');
      }

      onResolve();
    } catch (err) {
      const message = err instanceof Error ? err.message : "정답을 생성하는 중 오류가 발생했습니다.";
      setError(message);
      toast.error(message);
      setShowAnswer(false);
    } finally {
      setIsLoadingAnswer(false);
    }
  };


  return (
    <div
      ref={scrollRef}
      className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden scrollbar-auto bg-background"
    >
      <div className="max-w-4xl mx-auto w-full relative min-h-full flex flex-col">
        {/* ===== 1. 헤더 영역 (제목 + 게이지 + 문제/시도/목표) ===== */}
        <div className="sticky top-0 z-20 bg-background pt-2 sm:pt-4 pb-3 mb-2 px-4 sm:px-6">
          <div className="bg-background/95 backdrop-blur-sm border border-black/10 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 space-y-3">
              {/* Row 1: Category & Title & Gauge */}
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="flex items-start min-w-0 flex-1 gap-2 sm:gap-3">
                  {onMenuClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onMenuClick}
                      className="sm:hidden p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  )}
                  <div className="flex flex-col min-w-0 flex-1 gap-1">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{session.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base sm:text-lg text-foreground truncate leading-tight">
                        {session.title.replace(/^TITLE:\s*/, '')}
                      </span>
                      {session.isResolved && (
                        <span className="resolved-badge flex-shrink-0 text-[10px] px-1.5 py-0.5">해결</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center pt-1">
                  <div className="flex items-center gap-1 px-1">
                    <button
                      onClick={handleCopyAll}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                      title="전체 복사"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                      title="공유하기"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/5" />

              {/* Row 2: Problem & Approach */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="font-semibold text-foreground/80 min-w-[50px]">Problem:</span>
                  <p className="truncate flex-1">{session.problem}</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ===== 2. 대화 메시지 영역 ===== */}
        <div className="flex-1 px-4 sm:px-6 py-4 space-y-8 transition-all">
          {(isInitialLoading || session.messages.length === 0) && (
            <div className="flex justify-start">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">질문을 탐구하고 있습니다</p>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {session.messages.map((msg, index) => (
            <div key={msg.id} className={cn("w-full", index === 0 ? "mb-1" : "")}>
              <ChatMessage 
                message={msg} 
                isDirectMode={false} 
                isLast={index === session.messages.length - 1} 
                onFeedback={(f) => onFeedback(msg.id, f)}
                className={index === 0 ? "mb-1" : ""}
              />
              {index === 0 && msg.role === 'assistant' && msg.examples && msg.examples.length > 0 && (
                <div className="mt-0 mb-8 border-l-2 border-primary/20 pl-4 py-1">
                  <div className="space-y-2">
                    {msg.examples.map((ex, i) => (
                      <p 
                        key={i} 
                        className="text-[13.5px] text-foreground/70 font-medium leading-relaxed flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-700 fill-mode-both"
                        style={{ animationDelay: `${500 + (i * 150)}ms` }}
                      >
                        <span className="text-primary/40 mt-1">•</span>
                        <span>{ex}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quick Replies */}
          {showQuickReplies && (
            <div className="flex flex-row gap-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 !mt-2">
              <button
                onClick={handleViewAnswer}
                className="rounded-full px-4 py-2 text-sm border border-border bg-secondary/30 transition-all hover:bg-secondary active:scale-95 font-medium shadow-sm hover:shadow-md"
              >
                {t('viewAnswer')}
              </button>
              <button
                onClick={() => navigate('/')}
                className="rounded-full px-4 py-2 text-sm border border-border bg-secondary/30 transition-all hover:bg-secondary active:scale-95 font-medium shadow-sm hover:shadow-md"
              >
                {t('newSession')}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* 정답 블록 */}
          {showAnswer && (
            <div className="bg-secondary/30 rounded-xl p-5 space-y-3 border border-border shadow-sm mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 group/answer relative">
              <div className="flex items-center justify-between text-primary">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">탐구 내용</span>
                </div>
                {!isLoadingAnswer && finalAnswer && (
                  <CopyButton
                    content={finalAnswer}
                    className="bg-background/50 hover:bg-accent text-accent-foreground"
                  />
                )}
              </div>
              <div className="text-sm text-foreground leading-relaxed">
                {isLoadingAnswer ? (
                  <div className="flex items-center gap-2 font-mono text-foreground/70">
                    <span>탐구 내용을 정리하고 있습니다...</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  <div className="prose-markdown prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {finalAnswer || "정답을 불러오는 중입니다..."}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Spacer to prevent content from being hidden under sticky input */}
          <div className="h-24" />
        </div>

        {/* ===== 3. 입력창 영역 (Sticky floating container) ===== */}
        {
          !showAnswer && (
            <div className="sticky bottom-10 z-20 mx-4 mt-auto">
              {/* Gemini-style Fade Overlay */}
              <div className="absolute bottom-full left-0 right-0 h-[60px] bg-gradient-to-t from-background to-transparent pointer-events-none" />

              <div className="space-y-3">
                {/* Verification Buttons (Styled independently now) */}
                {needsVerification && !isEditingProblem && (
                  <div className="flex gap-3 justify-center py-2 bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-sm">
                    <button
                      onClick={handleVerifyConfirm}
                      className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
                    >
                      맞아요
                    </button>
                    <button
                      onClick={handleVerifyEdit}
                      className="flex-1 py-3 px-4 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all shadow-sm active:scale-[0.98] border border-border/50"
                    >
                      수정하기
                    </button>
                  </div>
                )}

                {(!needsVerification || isEditingProblem) && (!session.isResolved && !isComplete) && (
                    <ChatInput
                      onSend={handleSend}
                      isLoading={isLoading}
                      disabled={isLoading}
                      placeholder={
                        isEditingProblem
                          ? "문제를 보완할 수 있도록 입력해 주세요"
                          : "이어서 생각해 볼까요?"
                      }
                      autoFocus={isEditingProblem}
                    />
                  )}


                {showEarlyComplete && (
                      <div className="flex flex-col gap-3 py-4 items-center bg-background/95 backdrop-blur-sm rounded-xl">
                        <button
                          onClick={handleViewAnswer}
                          className="w-full py-3.5 px-6 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] text-base"
                        >
                          정답을 확인해 보세요
                        </button>
                        <button
                          onClick={() => setShowEarlyComplete(false)}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
                        >
                          🔍 더 탐구하기
                        </button>
                      </div>
                    )}

                    {isComplete && !showEarlyComplete && !needsVerification && (
                      <div className="flex flex-col gap-4 py-6 px-4 items-center bg-background/95 backdrop-blur-sm border border-black/10 rounded-2xl shadow-lg mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="material-icons text-xl text-primary">chat_bubble_outline</span>
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-semibold text-foreground">
                            {t('depthLimitReached')}
                          </p>
                        </div>
                        <button
                          onClick={handleViewAnswer}
                          className="w-full max-w-sm py-3 px-6 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] text-base"
                        >
                          {t('viewAnswer')}
                        </button>
                      </div>
                    )}
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}
