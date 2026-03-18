import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserSettings, getUserSettings, setUserSettings } from "@/utils/userProfile";
import { checkIsPro } from "@/utils/subscription";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LabelList
} from "recharts";
import { 
  ArrowLeft, 
  User, 
  CreditCard, 
  TrendingUp, 
  MessageSquare, 
  LayoutDashboard,
  ArrowUpRight,
  Sparkles,
  Menu,
  Plus,
  Info
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { useChatStorage } from "@/hooks/useChatStorage";
import { useIsMobile } from "@/hooks/use-mobile";
import { SubPageNav } from "@/components/SubPageNav";
import { cn } from "@/lib/utils";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLanguage } from "@/contexts/LanguageContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const MyInsight = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const { shortTermUsage, longTermUsage, isLoading: usageLoading, checkUsage } = useUsageLimit();
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("summary");
  const { t, language } = useLanguage();

  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    clearActiveSession,
    deleteSession,
    updateSessionTitle,
    togglePinSession,
  } = useChatStorage();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      if (user) {
        // Fetch user profile settings
        const settings = await getUserSettings(user.uid);
        setProfile(settings);

        // Fetch pro status
        const proStatus = await checkIsPro(user.uid);
        setIsPro(proStatus);

        // Update insightBadge to false since we are viewing the page
        if (settings.insightBadge) {
          await setUserSettings(user.uid, { insightBadge: false });
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, navigate]);

  const handleToggleNotification = async (checked: boolean) => {
    if (!user) return;
    try {
      await setUserSettings(user.uid, { insightNotification: checked });
      setProfile(prev => prev ? { ...prev, insightNotification: checked } : null);
      toast.success(t('settingsSaved'));
    } catch (error) {
      toast.error(t('settingsSaveError'));
    }
  };

  // Scroll tracking for mobile nav
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ['summary', 'interests', 'conversations', 'spectrum'];
    
    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading]);

  // Sync collapsed state with mobile/desktop transition
  useEffect(() => {
    setIsSidebarCollapsed(isMobile);
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalMessageCount = profile?.totalMessageCount || 0;
  const messagesToNextUpdate = 20 - (totalMessageCount % 20);
  // Show guide if we need more messages for the next update
  const showGuide = totalMessageCount < 20;
  const EXAMPLE_INSIGHT = {
    comment: "예시 분석: 당신은 논리적인 추론을 바탕으로 문제의 근본 원인을 탐구하는 성향이 강합니다. 특히 복잡한 현상을 구조화하여 이해하려는 노력이 돋보이며, 감성적인 공감보다는 객관적인 사실에 기반한 결론을 도출하는 데 집중하는 편입니다.",
    categories: [
      { name: "문제 풀이", count: 12 },
      { name: "아이디어 탐구", count: 8 },
      { name: "토론", count: 7 },
      { name: "자기계발", count: 5 },
      { name: "언어 · 외국어", count: 4 },
      { name: "창작", count: 2 },
      { name: "자유 탐구", count: 1 }
    ],
    deepConversations: [
      { title: "자유의지와 결정론에 대하여", conversationId: "example-1", count: 24 },
      { title: "인공지능의 자의식 가능성", conversationId: "example-2", count: 18 },
      { title: "양자역학의 해석 문제", conversationId: "example-3", count: 15 },
      { title: "도덕적 허무주의에 대한 비판", conversationId: "example-4", count: 12 },
      { title: "현대 사회의 소외 현상", conversationId: "example-5", count: 8 }
    ],
    spectrums: {
      whyVsHow: 85,
      emotionVsLogic: 20,
      processVsResult: 70
    },
    spectrumChanges: {
      whyVsHow: 5,
      emotionVsLogic: -2,
      processVsResult: 10
    }
  };

  const isExample = (profile?.totalMessageCount || 0) < 20;
  const displayInsight = isExample ? EXAMPLE_INSIGHT : profile?.insight;

  // Formatting categories for Recharts
  const chartData = displayInsight?.categories
    ? [...displayInsight.categories]
        .sort((a, b) => b.count - a.count)
        .map(cat => ({
          name: cat.name,
          count: cat.count
        }))
    : [];

  const radarData = displayInsight ? [
    { subject: '이유(Why)', value: displayInsight.spectrums.whyVsHow, fullMark: 100 },
    { subject: '감성(Emotion)', value: displayInsight.spectrums.emotionVsLogic, fullMark: 100 },
    { subject: '과정(Process)', value: displayInsight.spectrums.processVsResult, fullMark: 100 },
    { subject: '방법(How)', value: 100 - displayInsight.spectrums.whyVsHow, fullMark: 100 },
    { subject: '논리(Logic)', value: 100 - displayInsight.spectrums.emotionVsLogic, fullMark: 100 },
    { subject: '결과(Result)', value: 100 - displayInsight.spectrums.processVsResult, fullMark: 100 },
  ] : [];

  const formatResetDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString('ko-KR', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const getUsagePercent = (usage: any) => {
    if (!usage) return 0;
    return Math.min(100, Math.round((usage.count / usage.limit) * 100));
  };

  const sections = [
    { id: "summary", label: "AI 분석 요약" },
    { id: "interests", label: "나의 관심 분야" },
    { id: "conversations", label: "깊이 탐구한 대화" },
    { id: "spectrum", label: "탐구 성향 분석" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-black">
      {/* Desktop Sidebar */}
      <div className="hidden sm:flex flex-shrink-0">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => { setActiveSessionId(id); navigate(`/?session=${id}`); }}
          onNewSession={() => { clearActiveSession(); navigate("/"); }}
          onDeleteSession={deleteSession}
          onUpdateTitle={updateSessionTitle}
          onTogglePin={togglePinSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => { setActiveSessionId(id); navigate(`/?session=${id}`); }}
        onNewSession={() => { clearActiveSession(); navigate("/"); }}
        onDeleteSession={deleteSession}
        onUpdateTitle={updateSessionTitle}
        onTogglePin={togglePinSession}
        open={isMobileSidebarOpen}
        onOpenChange={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen relative overflow-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 h-14 shrink-0 sm:hidden">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="메뉴 열기"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-medium text-base text-black">나의 인사이트</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate("/")}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
                aria-label="메인으로 가기"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Sub-Navigation */}
        {isMobile && (
          <SubPageNav 
            items={sections}
            activeId={activeSection}
            onItemClick={scrollToSection}
            className="sm:hidden"
          />
        )}

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-16">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              
              {/* Left Section Navigation (Sticky on Desktop) */}
              <aside className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-12 space-y-8">
                  <h2 className="text-2xl font-bold text-black px-3 tracking-tight">Insight</h2>
                    <nav className="space-y-1">
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-[15px] font-medium text-black hover:bg-secondary transition-all"
                        >
                          {section.label}
                        </button>
                      ))}
                    </nav>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-16 lg:space-y-20">
                {/* Welcome & Guide Banner (Visible only for new users) */}
                {isExample && (
                  <section className="bg-black/[0.03] border border-black/10 rounded-[32px] p-10 relative overflow-hidden max-w-2xl">
                    <div className="relative z-10 space-y-4 text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight leading-tight">
                        {t('insightWelcomeTitle')}
                      </h2>
                      <p className="text-sm sm:text-base font-medium text-black/70 leading-relaxed whitespace-pre-line">
                        {t('insightWelcomeDesc')}
                      </p>
                      <div className="pt-2">
                        <Button 
                          onClick={() => navigate("/")}
                          className="rounded-full px-8 py-6 text-base font-bold shadow-sm"
                        >
                          대화 시작하기
                        </Button>
                      </div>
                    </div>
                  </section>
                )}

                <div className="space-y-16 lg:space-y-20">
                  {/* AI Summary Section */}
                  <section id="summary" className="space-y-6 scroll-mt-24">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-5 h-5 text-primary" />
                          <h3 className="text-xl font-medium text-black tracking-tight">AI 분석 요약</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[13px] font-medium text-black/40">{t('insightNotifications')}</span>
                          <Switch 
                            className="data-[state=checked]:bg-black scale-90"
                            checked={profile?.insightNotification}
                            onCheckedChange={handleToggleNotification}
                          />
                        </div>
                      </div>
                    <div className={cn(
                      "bg-white border border-border shadow-sm rounded-[32px] p-10 relative overflow-hidden group max-w-2xl",
                      isExample && "opacity-90"
                    )}>
                      <p className="text-lg font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap relative z-10 antialiased">
                        {displayInsight?.comment || "충분한 데이터가 쌓이면 AI가 당신의 성향을 분석해 드립니다."}
                      </p>
                    </div>
                  </section>

                  {/* Interests Chart */}
                  <section id="interests" className="space-y-6 scroll-mt-24">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 text-black font-medium text-xl tracking-tight">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3>나의 관심 분야</h3>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[32px] p-8 lg:p-12 max-w-2xl group hover:shadow-md transition-all">
                    <div className="h-[280px] w-full px-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="rgba(0,0,0,0.03)" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            width={180}
                            tick={(props) => {
                              const { x, y, payload, index } = props;
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text
                                    x={-170}
                                    y={0}
                                    dy={4}
                                    textAnchor="start"
                                    fill="#000"
                                    style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}
                                  >
                                    <tspan fill="#000" opacity={0.3} className="mr-2">{index + 1}</tspan>
                                    <tspan dx={12}>{payload.value}</tspan>
                                  </text>
                                </g>
                              );
                            }}
                          />

                          <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={32}>
                            {chartData.map((entry, index) => {
                              let opacity = 0.25;
                              if (index === 0) opacity = 1;
                              else if (index === 1) opacity = 0.7;
                              else if (index === 2) opacity = 0.45;
                              
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`rgba(var(--primary-rgb), ${opacity})`} 
                                />
                              );
                            })}
                            <LabelList 
                              dataKey="count" 
                              position="right" 
                              formatter={(value: number) => `${value}회`}
                              style={{ fill: '#000', fontSize: 16, fontWeight: 700 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </div>
                  </section>

                  {/* Deep Conversations */}
                  <section id="conversations" className="space-y-8 scroll-mt-24 pt-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 text-black font-medium text-xl tracking-tight">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <h3>깊이 탐구한 대화</h3>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[32px] divide-y divide-border/50 max-w-2xl overflow-hidden">
                      {displayInsight?.deepConversations?.slice(0, 5).map((conv, idx) => (
                        <button
                          key={idx}
                          onClick={() => !isExample && navigate(`/?session=${conv.conversationId}`)}
                          className={cn(
                            "w-full flex items-center gap-6 p-6 hover:bg-secondary/[0.25] transition-all group text-left",
                            isExample && "cursor-default"
                          )}
                        >
                          <span className="text-2xl font-black text-primary/20 group-hover:text-primary/40 transition-colors w-6 text-center">
                            {idx + 1}
                          </span>
                          <span className="text-[16px] font-bold text-black line-clamp-1 flex-1 group-hover:underline underline-offset-4">{conv.title}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-[16px] font-bold text-black">{(conv as any).count || 0}회</span>
                            {!isExample && (
                              <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1">
                                <ArrowUpRight className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </button>
                      )) || (
                        <div className="py-20 text-center text-muted-foreground text-base font-medium italic">
                          아직 기록된 깊은 대화가 없습니다.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Personality Spectrum (Radar Chart) */}
                  <section id="spectrum" className="space-y-8 scroll-mt-24 pt-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 text-black font-medium text-xl tracking-tight">
                        <LayoutDashboard className="w-5 h-5 text-primary" />
                        <h3>탐구 성향 분석</h3>
                      </div>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[40px] p-4 sm:p-8 lg:p-12 max-w-2xl group relative overflow-hidden">
                      <div className="h-[320px] sm:h-[380px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid stroke="rgba(0,0,0,0.08)" />
                            <PolarAngleAxis 
                              dataKey="subject" 
                              tick={{ fill: '#000', fontSize: 13, fontWeight: 500 }}
                            />
                            <PolarRadiusAxis 
                              angle={90} 
                              domain={[0, 100]} 
                              tick={false} 
                              axisLine={false} 
                            />
                            <Radar
                              name="Status"
                              dataKey="value"
                              stroke="var(--primary)"
                              fill="var(--primary)"
                              fillOpacity={0.25}
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#fff', stroke: 'var(--primary)', strokeWidth: 2 }}
                              isAnimationActive={false}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label: "WHY 집중도", value: displayInsight?.spectrums.whyVsHow || 0, tip: "왜(Why)라는 질문을 얼마나 자주 탐구하는지를 나타냅니다" },
                          { label: "논리적 사고", value: 100 - (displayInsight?.spectrums.emotionVsLogic || 50), tip: "감성보다 논리적 근거를 중심으로 사고하는 정도입니다" },
                          { label: "과정 지향성", value: displayInsight?.spectrums.processVsResult || 0, tip: "결과보다 탐구하는 과정 자체를 중시하는 성향입니다" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-secondary/20 rounded-2xl p-4 space-y-3 relative group/tooltip">
                             <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-bold text-black uppercase tracking-widest">{stat.label}</span>
                                <Info className="w-3 h-3 text-black/50" />
                              </div>
                              <span className="text-[22px] font-black text-black tracking-tighter">{stat.value}%</span>
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-4 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                              <div className="bg-foreground text-white text-[13px] leading-relaxed rounded-xl px-3 py-2 w-48 shadow-xl border border-white/10">
                                {stat.tip}
                              </div>
                            </div>

                            <div className="h-[4px] w-full bg-black/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${stat.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyInsight;
