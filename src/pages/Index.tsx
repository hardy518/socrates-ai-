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
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();
  const [depth, setDepth] = useState(3);
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
    updateSessionTitle
  } = useChatStorage();

  const { canUse, remainingCount, checkAndIncrementUsage } = useUsageLimit();

  const handleCreateSession = async (form: QuestionFormType, depth: number) => {
    if (!canUse) {
      toast.error(t('dailyLimitReached'));
      return;
    }

    setIsCreatingSession(true);
    let createdSessionId: string | null = null;

    try {
      const newSession = await createSession(form, depth);
      createdSessionId = newSession.id;

      const success = await checkAndIncrementUsage(createdSessionId);
      if (!success) {
        toast.error(t('usageLimitReached'));
        await deleteSession(createdSessionId);
        setIsCreatingSession(false);
        return;
      }

      let initialPrompt = "";

      // 파일이 있는 경우: 이미지 검증 흐름 (Step 0)
      if (form.files && form.files.length > 0) {
        initialPrompt = `사용자가 이미지를 업로드하며 다음과 같이 질문했습니다:
        
카테고리: ${form.category}
문제: ${form.problem}
${form.attempts ? `시도/배경: ${form.attempts}` : ""}

1. 가장 먼저 이미지와 사용자의 질문을 분석하여 세션의 제목을 "TITLE: [제목]" 형식으로 첫 줄에 출력하세요.
2. 그 다음 줄바꿈 후, "[VERIFICATION_NEEDED]" 태그를 붙이세요.
3. 그 다음, 사용자가 올린 문제가 맞는지 확인하는 질문을 하세요.
예시: "이 문제가 맞나요? [문제 내용 요약]"`;
      } else {
        // 파일이 없는 경우: 바로 소크라테스 대화 시작 (Step 1)
        initialPrompt = `사용자가 다음과 같은 상황을 공유했습니다:

카테고리: ${form.category}
문제: ${form.problem}
${form.attempts ? `시도/배경: ${form.attempts}` : ""}

1. 가장 먼저 사용자의 질문을 분석하여 세션의 제목을 "TITLE: [제목]" 형식으로 첫 줄에 출력하세요.
2. 그 다음 줄바꿈 후, 소크라테스식 대화를 시작하기 위한 자연스럽고 친근한 첫 질문을 던져주세요.`;
      }

      const { generateAIResponse } = await import("@/lib/claude");
      const aiResponse = await generateAIResponse(newSession, initialPrompt, form.files);

      // 제목 파싱 로직 (TITLE: [...])
      let cleanResponse = aiResponse;
      const titleMatch = aiResponse.match(/TITLE:\s*(.+)/);

      if (titleMatch) {
        const newTitle = titleMatch[1].trim();
        console.log("🏷️ 감지된 제목:", newTitle);
        await updateSessionTitle(createdSessionId, newTitle);

        // 응답에서 TITLE: 라인과 그 뒤의 줄바꿈/구분선 제거
        // TITLE: ... \n --- \n 부분을 제거하거나
        // TITLE: ... \n 부분을 제거
        cleanResponse = aiResponse.replace(/TITLE:\s*.+(\n+---\n+)?/, '').trim();
      }

      // AI 응답 저장 (정제된 내용)
      await addMessage(createdSessionId, { role: 'assistant', content: cleanResponse });

    } catch (err) {
      console.error("❌ 세션 생성 실패:", err);
      toast.error(t('sessionCreateFailed'));
      // 에러 발생 시 세션 삭제
      if (createdSessionId) {
        await deleteSession(createdSessionId);
      }
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

  const handleResolve = async () => {
    if (!activeSession) return;
    await resolveSession(activeSession.id);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">


      {/* Desktop Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={clearActiveSession}
        onDeleteSession={deleteSession}
        onUpdateTitle={updateSessionTitle}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content + Ad */}
      <div className="flex-1 flex min-w-0">
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
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] px-6">
              <div className="max-w-2xl w-full space-y-6">
                <h1 className="text-4xl font-bold text-foreground">{t('mainTitle')}</h1>
                <QuestionForm onSubmit={handleCreateSession} depth={depth} onDepthChange={setDepth} />
              </div>
            </div>
          )}
        </main>

        {/* Ad Slot */}
        <AdSlot />
      </div>
    </div>
  );
};

export default Index;
