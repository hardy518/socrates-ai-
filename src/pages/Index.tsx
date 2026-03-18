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
import logoImage from "@/assets/logo.png";

const CATEGORY_EXAMPLES: Record<string, { ko: string[]; en: string[] }> = {
  "problem-solving": {
    ko: ["어떤 문제에 부딪히고 있나요?", "어디서 막혔는지 알려주세요", "어떤 개념이 헷갈리시나요?"],
    en: ["What problem are you facing?", "Where are you stuck?", "Which concept is confusing?"]
  },
  "idea-exploration": {
    ko: ["어떤 아이디어를 검증하고 싶으신가요?", "사업 아이디어가 있으신가요?", "어떤 문제를 해결하고 싶으신가요?"],
    en: ["What idea do you want to validate?", "Do you have a business idea?", "What problem do you want to solve?"]
  },
  "debate": {
    ko: ["어떤 주제로 토론하고 싶으신가요?", "최근 고민하는 철학적 질문이 있나요?", "어떤 관점을 탐구해보고 싶으신가요?"],
    en: ["What topic would you like to debate?", "Any philosophical questions on your mind?", "What perspective do you want to explore?"]
  },
  "self-development": {
    ko: ["어떤 고민을 갖고 오셨나요?", "진로나 커리어에서 막히는 부분이 있나요?", "요즘 어떤 감정을 느끼고 계신가요?"],
    en: ["What's on your mind?", "Any career or life path obstacles?", "What emotions are you feeling lately?"]
  },
  "language": {
    ko: ["어떤 언어를 공부하고 계신가요?", "어떤 부분이 어려우신가요?", "어떤 표현을 익히고 싶으신가요?"],
    en: ["What language are you studying?", "What parts are difficult?", "What expressions do you want to learn?"]
  },
  "creation": {
    ko: ["어떤 작품을 만들고 있나요?", "어디서 막히셨나요?", "어떤 스타일을 추구하고 싶으신가요?"],
    en: ["What are you creating?", "Where did you get stuck?", "What style are you aiming for?"]
  },
  "free-exploration": {
    ko: ["어떤 이야기든 편하게 시작해보세요", "요즘 머릿속에 맴도는 게 있나요?", "뭘 모르는지 모르는 상태여도 괜찮아요"],
    en: ["Feel free to start any story", "Anything lingering in your mind?", "It's okay if you don't know what you don't know"]
  }
};

const Index = () => {
  const { language, t } = useLanguage();
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
    updateSessionProblem,
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

      const newSession = await createSession(form, newSessionDepth, t('waitingForFirstMessage'));
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
        const examples = (CATEGORY_EXAMPLES[form.category] || CATEGORY_EXAMPLES["free-exploration"])[(language as 'ko' | 'en') || 'ko'];
        initialPrompt = `사용자가 다음과 같은 상황을 공유했습니다:

카테고리: ${form.category}
${form.problem ? `문제: ${form.problem}` : "주제에 대해 자유롭게 탐구를 시작하고 싶어합니다."}

1. 사용자가 선택한 카테고리에 맞춰 친근한 인사와 함께 대화를 시작하기 위한 첫 질문을 한 문장으로 던져주세요.
2. 그 다음 줄바꿈 후, "EXAMPLES:" 태그를 붙이고 아래의 예시 질문 3개를 번호를 매겨서 출력해주세요.

예시 질문 리스트:
${examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}`;
      }

      const { generateAIResponse } = await import("@/lib/claude");
      const aiResponse = await generateAIResponse(newSession, initialPrompt, form.files);

      // EXAMPLES: 파싱 로직
      let cleanResponse = aiResponse;
      let parsedExamples: string[] = [];
      const examplesMatch = aiResponse.match(/EXAMPLES:\s*([\s\S]+)/);

      if (examplesMatch) {
        const examplesText = examplesMatch[1].trim();
        parsedExamples = examplesText
          .split('\n')
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(line => line.length > 0)
          .slice(0, 3);
        
        cleanResponse = aiResponse.split(/EXAMPLES:/)[0].trim();
      }

      // 파싱 실패 시 폴백
      if (parsedExamples.length === 0) {
        parsedExamples = (CATEGORY_EXAMPLES[form.category] || CATEGORY_EXAMPLES["free-exploration"])[(language as 'ko' | 'en') || 'ko'];
      }

      // AI 응답 저장 (정제된 내용 및 예시 질문 포함)
      await addMessage(createdSessionId, { 
        role: 'assistant', 
        content: cleanResponse,
        examples: parsedExamples 
      });

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
              onUpdateTitle={updateSessionTitle}
              onUpdateProblem={updateSessionProblem}
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

              <div className="flex-1 flex flex-col items-center pt-[5vh] sm:pt-[10vh] px-6 min-h-[500px]">
                <div className="max-w-4xl w-full">
                  {/* Greeting Message - Always visible at the top */}
                  <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out fill-mode-both flex flex-row items-center justify-center gap-4 text-left mb-8">
                    <img src={logoImage} alt="Socrates AI Logo" className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl shadow-md animate-in zoom-in-50 duration-1000" />
                    <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                      {t('exploreToday')}
                    </h1>
                  </div>

                  {!canUse && <div className="mb-10"><UsageLimitCard /></div>}
                  <QuestionForm
                    onSubmit={handleCreateSession}
                    initialProblem={searchParams.get('problem') || ""}
                    disabled={!canUse}
                  />
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
