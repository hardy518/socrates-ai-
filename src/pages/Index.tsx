import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChatStorage } from "@/hooks/useChatStorage";
import { useUsageLimit, DEPTH_ANONYMOUS, DEPTH_FREE, DEPTH_PRO } from "@/hooks/useUsageLimit";
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuestionForm as QuestionFormType, MessageFile } from "@/types/chat";
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
import { UsageLimitCard } from "@/components/UsageLimitCard";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { t } = useLanguage();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
    togglePinSession,
    updateMessage,
    forkSession,
  } = useChatStorage();

  const { user } = useAuth();

  const { canUse, isPro, checkAndIncrementUsage } = useUsageLimit();

  // Load settings from user profile
  useEffect(() => {
    const loadSettings = async () => {
      if (user && !user.isAnonymous) {
        await getUserSettings(user.uid);
      }
    };
    loadSettings();
  }, [user]);

  // 🔥 URL의 session 파라미터와 activeSessionId 동기화
  useEffect(() => {
    const sessionFromUrl = searchParams.get('session');
    if (sessionFromUrl && sessionFromUrl !== activeSessionId) {
      setActiveSessionId(sessionFromUrl);
    } else if (!sessionFromUrl && activeSessionId) {
      clearActiveSession();
    }
  }, [searchParams, activeSessionId, setActiveSessionId, clearActiveSession]);

  const handleSelectSession = (id: string) => {
    setSearchParams({ session: id });
  };

  const handleNewSession = () => {
    setSearchParams({});
    clearActiveSession();
  };

  // Sync collapsed state with mobile/desktop transition
  useEffect(() => {
    setIsSidebarCollapsed(isMobile);
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  // 🔥 인사이트 업데이트 토스트 알림
  const lastBadgeRef = useRef(false);
  useEffect(() => {
    if (user && !user.isAnonymous) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
        if (doc.exists()) {
          const hasBadge = doc.data().insightBadge === true;
          if (hasBadge && !lastBadgeRef.current) {
            toast("인사이트가 업데이트됐어요 →", {
              duration: 3000,
              action: {
                label: "보기",
                onClick: () => navigate("/my-insight")
              },
              style: { 
                backgroundColor: '#8B5CF6',
                color: 'white',
                border: 'none'
              }
            });
          }
          lastBadgeRef.current = hasBadge;
        }
      });
      return () => unsub();
    }
  }, [user]);

  const handleCreateSession = async (form: QuestionFormType) => {
    if (!canUse) {
      return;
    }

    setIsCreatingSession(true);
    let createdSessionId: string | null = null;

    try {
      let newSessionDepth = DEPTH_FREE;
      if (isPro) {
        newSessionDepth = DEPTH_PRO;
      } else if (user?.isAnonymous) {
        newSessionDepth = DEPTH_ANONYMOUS;
      }

      const newSession = await createSession(form, newSessionDepth);
      createdSessionId = newSession.id;
      setSearchParams({ session: createdSessionId }); // 🔥 세션 생성 직후 URL 즉시 업데이트

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

1. 가장 먼저 이미지와 사용자의 질문을 분석하여 세션의 제목을 "TITLE: [제목]" 형식으로 첫 줄에 출력하세요.
2. 그 다음 줄바꿈 후, "[VERIFICATION_NEEDED]" 태그를 붙이세요.
3. 그 다음, 사용자가 올린 문제가 맞는지 확인하는 질문을 하세요.
예시: "이 문제가 맞나요? [문제 내용 요약]"`;
      } else {
        // 성장 모드
        initialPrompt = `사용자가 다음과 같은 상황을 공유했습니다:

카테고리: ${form.category}
문제: ${form.problem}

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

    } catch (err) {
      console.error("❌ 세션 생성 실패:", err);
      toast.error(t('failed'));
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

  const handleFeedback = async (messageId: string, feedback: 'like' | 'dislike') => {
    if (!activeSession) return;
    await updateMessage(activeSession.id, messageId, { feedback });
  };


  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar (Only visible on SM and above) */}
      <div className="hidden sm:flex flex-shrink-0">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={deleteSession}
          onUpdateTitle={updateSessionTitle}
          onTogglePin={togglePinSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer (Hidden on MD+, trigger is in ChatView) */}
      <MobileSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={deleteSession}
        onUpdateTitle={updateSessionTitle}
        onTogglePin={togglePinSession}
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
              onFeedback={handleFeedback}
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
              </div>

              <div className="flex-1 flex flex-col items-center pt-[5vh] sm:pt-[15vh] px-6 min-h-[500px]">
                <div className="max-w-2xl w-full">

                  {canUse ? (
                    <QuestionForm
                      onSubmit={handleCreateSession}
                      initialProblem={searchParams.get('problem') || ""}
                    />
                  ) : (
                    <UsageLimitCard />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
};

export default Index;
