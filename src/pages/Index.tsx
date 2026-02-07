import { toast } from "sonner";  
import { useState } from "react";
import { useChatStorage } from "@/hooks/useChatStorage";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { QuestionForm as QuestionFormType, MessageFile } from "@/types/chat";
import { Sidebar } from "@/components/Sidebar";
import { InitialGuide } from "@/components/InitialGuide";
import { QuestionForm } from "@/components/QuestionForm";
import { ChatView } from "@/components/ChatView";
import { AdSlot } from "@/components/AdSlot";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const [depth, setDepth] = useState(5);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);
  
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    addMessage,
    resolveSession,
    deleteSession,
    clearActiveSession,
  } = useChatStorage();

  const { canUse, remainingCount, checkAndIncrementUsage } = useUsageLimit();

  const handleCreateSession = async (form: QuestionFormType, depth: number) => {
    if (!canUse) {
      toast.error('오늘의 무료 사용 횟수(2회)를 모두 사용했습니다. 내일 다시 이용해주세요!');
      return;
    }

    setIsCreatingSession(true);
    console.log("🚀 세션 생성 시작!");
    
    try {
      const newSession = await createSession(form, depth);
      const sessionId = newSession.id;
      console.log("✅ 세션 ID:", sessionId);
      
     const success = await checkAndIncrementUsage(sessionId);
if (!success) {
  toast.error('사용 횟수 제한에 도달했습니다.');
  setIsCreatingSession(false); // ← 이 줄만 추가!
  return;
}
      
      const initialPrompt = `사용자가 다음과 같은 상황을 공유했습니다:

문제: ${form.problem}
시도: ${form.attempts}
목표: ${form.goal}

소크라테스식 대화를 시작하기 위한 자연스럽고 친근한 첫 질문을 던져주세요.`;

      console.log("📝 프롬프트:", initialPrompt);

      console.log("🔄 AI 호출 시작...");
      const { generateAIResponse } = await import("@/lib/claude");
      const aiResponse = await generateAIResponse(newSession, initialPrompt);
      console.log("💬 AI 응답:", aiResponse);
      await addMessage(sessionId, { role: 'assistant', content: aiResponse });
      console.log("✅ 메시지 추가 완료!");
    } catch (err) {
      console.error("❌ 세션 생성 실패:", err);
      toast.error('세션 생성에 실패했습니다.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendMessage = async (content: string, files?: MessageFile[]) => {
  if (!activeSession) return;
  
  // 🔥 files가 undefined/빈배열이면 아예 안 넣기
  const messageData: { role: 'user'; content: string; files?: MessageFile[] } = {
    role: 'user',
    content
  };
  
  if (files && files.length > 0) {
    messageData.files = files;
  }
  
  await addMessage(activeSession.id, messageData);
};
  
  const handleSendAIMessage = async (content: string) => {
    if (!activeSession) return;
    await addMessage(activeSession.id, { role: 'assistant', content });
  };

  const handleResolve = async (finalAnswer?: string) => {
    if (!activeSession) return;
    await resolveSession(activeSession.id, finalAnswer);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      

      {/* Desktop Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={clearActiveSession}
        onDeleteSession={deleteSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content + Ad */}
      <div className="flex-1 flex min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 flex flex-col min-w-0">
          {activeSession ? (
            <ChatView
              session={activeSession}
              onSendMessage={handleSendMessage}
              onSendAIMessage={handleSendAIMessage}
              onResolve={handleResolve}
              isInitialLoading={isCreatingSession}
            />
          ) : (
            <>
              <InitialGuide />
              <div className="px-6 pb-8 max-w-2xl mx-auto w-full">
                <QuestionForm onSubmit={handleCreateSession} depth={depth} onDepthChange={setDepth} />
              </div>
            </>
          )}
        </main>

        {/* Ad Slot */}
        <AdSlot />
      </div>
    </div>
  );
};

export default Index;
