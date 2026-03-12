import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useChatStorage } from "@/hooks/useChatStorage";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { QuestionForm as QuestionFormType, MessageFile, ChatMode } from "@/types/chat";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { InitialGuide } from "@/components/InitialGuide";
import { QuestionForm } from "@/components/QuestionForm";
import { ChatView } from "@/components/ChatView";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserSettings, setUserSettings } from "@/utils/userProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UsageLimitModal } from "@/components/UsageLimitModal";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { t } = useLanguage();
  const [depth, setDepth] = useState(3);
  const [chatMode, setChatMode] = useState<ChatMode>("socrates");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

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
    updateSessionTitle,
    updateSessionMode
  } = useChatStorage();

  const { user } = useAuth();

  const { canUse, remainingCount, checkAndIncrementUsage } = useUsageLimit();

  // Load settings from user profile
  useEffect(() => {
    const loadSettings = async () => {
      if (user && !user.isAnonymous) {
        const settings = await getUserSettings(user.uid);
        setChatMode(settings.chatMode);
        setDepth(settings.socratesLevel);
      }
    };
    loadSettings();
  }, [user]);

  const handleDepthChange = async (newDepth: number) => {
    setDepth(newDepth);
    if (user && !user.isAnonymous) {
      await setUserSettings(user.uid, { socratesLevel: newDepth });
    }
  };

  const handleChatModeChange = async (newMode: ChatMode) => {
    setChatMode(newMode);
    if (user && !user.isAnonymous) {
      await setUserSettings(user.uid, { chatMode: newMode });
    }
  };

  // Sync collapsed state with mobile/desktop transition
  useEffect(() => {
    setIsSidebarCollapsed(isMobile);
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const handleCreateSession = async (form: QuestionFormType, depth: number, mode: ChatMode) => {
    if (!canUse) {
      setIsUsageModalOpen(true);
      return;
    }

    setIsCreatingSession(true);
    let createdSessionId: string | null = null;

    try {
      const newSession = await createSession(form, depth, mode);
      createdSessionId = newSession.id;

      const success = await checkAndIncrementUsage(createdSessionId);
      if (!success) {
        toast.error(t('usageLimitReached'));
        await deleteSession(createdSessionId);
        setIsCreatingSession(false);
        return;
      }

      let initialPrompt = "";

      if (form.files && form.files.length > 0) {
        initialPrompt = `사용자가 이미지를 업로드하며 다음과 같이 질문했습니다:
        
카테고리: ${form.category}
문제: ${form.problem}
${form.attempts ? `시도/배경: ${form.attempts}` : ""}

1. 가장 먼저 이미지와 사용자의 질문을 분석하여 세션의 제목을 "TITLE: [제목]" 형식으로 첫 줄에 출력하세요.
2. 그 다음 줄바꿈 후, "[VERIFICATION_NEEDED]" 태그를 붙이세요.
3. 그 다음, 사용자가 올린 문제가 맞는지 확인하는 질문을 하세요.
예시: "이 문제가 맞나요? [문제 내용 요약]"`;
      } else if (mode === 'direct') {
        initialPrompt = `사용자가 다음과 같은 상황을 공유했습니다:

카테고리: ${form.category}
문제: ${form.problem}
${form.attempts ? `시도/배경: ${form.attempts}` : ""}

1. 가장 먼저 사용자의 질문을 분석하여 세션의 제목을 "TITLE: [제목]" 형식으로 첫 줄에 출력하세요.
2. 그 다음 줄바꿈 후, 입력된 문제에 대해 질문 없이 바로 명확하고 구체적인 답변을 제공하세요.`;
      } else {
        // 성장 모드
        initialPrompt = `사용자가 다음과 같은 상황을 공유했습니다:

카테고리: ${form.category}
문제: ${form.problem}
${form.attempts ? `시도/배경: ${form.attempts}` : ""}

1. 가장 먼저 사용자의 질문을 분석하여 세션의 제목을 "TITLE: [제목]" 형식으로 첫 줄에 출력하세요.
2. 그 다음 줄바꿈 후, 성장 모드(소크라테스식 대화)를 시작하기 위한 자연스럽고 친근한 첫 질문을 던져주세요.`;
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
        cleanResponse = aiResponse.replace(/TITLE:\s*.+(\n+---\n+)?/, '').trim();
      }

      // AI 응답 저장 (정제된 내용)
      await addMessage(createdSessionId, { role: 'assistant', content: cleanResponse });

      // 즉답 모드일 경우 바로 해결 상태로 전환 (소크라테스 모드와 동일하게 입력창 숨김)
      if (mode === 'direct') {
        await resolveSession(createdSessionId);
      }

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
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar (Only visible on SM and above) */}
      <div className="hidden sm:flex flex-shrink-0">
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
      </div>

      {/* Mobile Drawer (Hidden on MD+, trigger is in ChatView) */}
      <MobileSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={clearActiveSession}
        onDeleteSession={deleteSession}
        onUpdateTitle={updateSessionTitle}
        open={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          {activeSession ? (
            <ChatView
              session={activeSession}
              onSendMessage={handleSendMessage}
              onSendAIMessage={handleSendAIMessage}
              onResolve={handleResolve}
              isInitialLoading={isCreatingSession}
              onMenuClick={() => setIsMobileSidebarOpen(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-y-auto h-full">
              {/* Mobile Menu Trigger for Initial View */}
              <div className="sm:hidden flex items-center p-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-30 w-full transition-all pt-[calc(1rem+env(safe-area-inset-top))]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg hover:bg-secondary relative"
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                >
                  <div className="relative w-5 h-5 transition-all duration-300">
                    <Menu className={cn(
                      "w-5 h-5 text-muted-foreground absolute inset-0 transition-all duration-300",
                      isMobileSidebarOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                    )} />
                    <X className={cn(
                      "w-5 h-5 text-muted-foreground absolute inset-0 transition-all duration-300",
                      isMobileSidebarOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                    )} />
                  </div>
                </Button>
                <div className="flex items-center gap-2 ml-3">
                  <span className="font-bold text-lg tracking-tight text-foreground">Socrates : Think deeper</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
                <div className="max-w-4xl w-full space-y-8">
                  <div className="space-y-4 text-center sm:text-left">
                  </div>

                  <QuestionForm
                    onSubmit={handleCreateSession}
                    depth={depth}
                    onDepthChange={handleDepthChange}
                    chatMode={chatMode}
                    onChatModeChange={handleChatModeChange}
                    initialProblem={searchParams.get('problem') || ""}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <UsageLimitModal 
        isOpen={isUsageModalOpen} 
        onClose={() => setIsUsageModalOpen(false)} 
      />
    </div>
  );
};

export default Index;
