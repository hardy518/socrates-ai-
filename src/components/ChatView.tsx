import { useEffect, useRef, useState } from "react";
import { Lightbulb, Terminal } from "lucide-react";
import { toast } from "sonner";
import { ChatSession, MessageFile } from "@/types/chat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { GrowthGauge } from "./GrowthGauge";
import { generateAIResponse, generateFinalAnswer } from "@/lib/claude";

interface ChatViewProps {
  session: ChatSession;
  /** 유저가 보낸 메시지용 */
  onSendMessage: (content: string, files?: MessageFile[]) => void;
  /** AI가 보낸 메시지용 */
  onSendAIMessage: (content: string) => void;
  onResolve: () => void;
  isInitialLoading?: boolean;
}

export function ChatView({ session, onSendMessage, onSendAIMessage, onResolve, isInitialLoading }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null);
  const [showEarlyComplete, setShowEarlyComplete] = useState(false);
  const isComplete = showEarlyComplete || session.currentStep >= session.depth;
  const canViewAnswer = isComplete && !session.isResolved;
  useEffect(() => {
    // 부모의 main 영역으로 스크롤
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({
        top: mainElement.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [session.messages, isLoading, isInitialLoading, showAnswer, isLoadingAnswer]);

  const handleSend = async (content: string, files?: MessageFile[]) => {
    // 1) 유저 메시지 저장
    onSendMessage(content, files);
    setIsLoading(true);
    setError(null);
    
    try {
      const aiResponse = await generateAIResponse(session, content);
      
      // [ANSWER_FOUND] 감지
      if (aiResponse.startsWith('[ANSWER_FOUND]')) {
        const cleanResponse = aiResponse.replace('[ANSWER_FOUND]', '').trim();
        // 2) AI 메시지로 저장
        onSendAIMessage(cleanResponse);
        setShowEarlyComplete(true);
      } else {
        onSendAIMessage(aiResponse);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "응답을 생성하는 중 오류가 발생했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAnswer = async () => {
    setIsLoadingAnswer(true);
    setShowAnswer(true);
    
    try {
      const answer = await generateFinalAnswer(session);
      setFinalAnswer(answer);
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
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      {/* ===== 1. Sticky 헤더 영역 (제목 + 게이지 + 문제/시도/목표) ===== */}
      <div className="sticky top-0 z-50 flex-shrink-0 bg-background border-b border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground truncate max-w-[200px]">
              {session.title}
            </span>
            {session.isResolved && (
              <span className="resolved-badge flex-shrink-0">해결</span>
            )}
          </div>
          <GrowthGauge current={Math.min(session.currentStep, session.depth)} total={session.depth} />
        </div>
        
        <div className="px-4 sm:px-6 pb-3 sm:pb-4">
          <div className="space-y-1.5 text-sm">
            <p className="truncate"><span className="font-medium text-foreground">문제:</span> <span className="text-muted-foreground">{session.problem}</span></p>
            <p className="truncate"><span className="font-medium text-foreground">시도:</span> <span className="text-muted-foreground">{session.attempts}</span></p>
            <p className="truncate"><span className="font-medium text-foreground">목표:</span> <span className="text-muted-foreground">{session.goal}</span></p>
          </div>
        </div>
      </div>

      {/* ===== 2. 스크롤 대화창 영역 (Scrollable Middle) ===== */}
      <div ref={scrollRef} className="flex-1">
        <div className="px-4 sm:px-6 py-4 space-y-4">
        {(isInitialLoading || session.messages.length === 0) && (
  <div className="flex justify-start">
    <div className="space-y-2">  {/* chat-bubble-ai 제거! */}
      <p className="text-sm text-muted-foreground">질문을 탐구하고 있습니다</p>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
)}
          
          {session.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          
          {isLoading && (
  <div className="flex justify-start">
    <div className="flex gap-1">  {/* chat-bubble-ai 제거! */}
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

          {showAnswer && (
            <div className="bg-[#1e1e2e] rounded-xl p-5 space-y-3 border border-[#313244] shadow-lg">
              <div className="flex items-center gap-2 text-[#a6e3a1]">
             
                <span className="font-mono text-sm font-semibold">해결 방향</span>
              </div>
              <div className="font-mono text-sm text-[#cdd6f4] leading-relaxed space-y-2 whitespace-pre-wrap">
                {isLoadingAnswer ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">해결 방안을 작성하고 있습니다...</span>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : (
                  finalAnswer || "정답을 불러오는 중입니다..."
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 3. Sticky 입력창 영역 (Sticky Bottom) ===== */}
      <div className="sticky bottom-0 z-40 flex-shrink-0 bg-background border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-4 sm:px-6 py-4 space-y-3">
        
        {/* 답 찾았을 때 버튼 2개 */}
        {showEarlyComplete && !showAnswer && (
          <div className="space-y-2">
            <button 
              onClick={handleViewAnswer}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              ✅ 정답 보기
            </button>
            <button 
              onClick={() => setShowEarlyComplete(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-sm"
            >
              🔍 더 탐구하기
            </button>
          </div>
        )}

        {canViewAnswer && !showAnswer && !showEarlyComplete && (
          <button 
            onClick={handleViewAnswer}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
           
            정답 보기
          </button>
        )}
        
        {!session.isResolved && !isComplete && (
          <ChatInput 
            onSend={handleSend} 
            disabled={isLoading}
            placeholder={session.currentStep === 0 ? "첫 번째 생각을 공유해주세요..." : "계속 이어서 생각해보세요..."}
          />
        )}
        
        {isComplete && !showAnswer && !showEarlyComplete && (
          <p className="text-center text-sm text-muted-foreground">
            목표 단계에 도달했습니다. 위의 [정답 보기] 버튼을 눌러 확인하세요.
          </p>
        )}
      </div>
    </div>
  );
}