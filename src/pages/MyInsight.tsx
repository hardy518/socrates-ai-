import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserSettings, setUserSettings } from "@/utils/userProfile";
import { checkIsPro } from "@/utils/subscription";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
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
  Plus
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { useChatStorage } from "@/hooks/useChatStorage";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UserSettings } from "@/utils/userProfile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUsageLimit } from "@/hooks/useUsageLimit";

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

  const conversationCount = profile?.conversationCount || 0;
  const sessionsToNextUpdate = 5 - (conversationCount % 5);
  // Show guide if we need more sessions for the next update
  const showGuide = sessionsToNextUpdate > 0;
  const insight = profile?.insight;

  // Formatting categories for Recharts
  const chartData = insight?.categories?.map(cat => ({
    name: cat.name,
    count: cat.count
  })) || [];

  const renderSpectrumBar = (label: string, value: number, leftLabel: string, rightLabel: string, change: number | null) => (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold text-foreground/80">{label}</span>
        {change !== null && change !== 0 && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
            change > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
          )}>
            {change > 0 ? `+${change}` : change}
          </span>
        )}
      </div>
      <div className="relative h-1.5 bg-secondary/50 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 bottom-0 bg-primary/80 transition-all duration-1000 ease-out"
          style={{ 
            left: `${Math.min(50, value)}%`, 
            right: `${100 - Math.max(50, value)}%` 
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-3 bg-border" />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );

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
              <h1 className="font-bold text-base">나의 인사이트</h1>
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

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-16">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              
              {/* Left Section Navigation (Sticky on Desktop) */}
              <aside className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-12 space-y-8">
                  <h2 className="text-2xl font-black text-foreground/90 px-3 tracking-tight">Insight</h2>
                  <nav className="space-y-1">
                    {sections.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-[15px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                      >
                        {section.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-24">
                {/* Profile Section */}
                <section id="profile" className="flex flex-col sm:flex-row items-center gap-8 pb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/10 shadow-sm shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-primary/40" />
                    )}
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2.5">
                    <h2 className="text-4xl font-black text-foreground tracking-tight">{user?.displayName || "Socrates User"}</h2>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em]",
                        isPro ? "bg-primary text-white" : "bg-black/5 text-muted-foreground"
                      )}>
                        {isPro ? "PRO Member" : "Free Plan"}
                      </span>
                      <span className="text-xs text-muted-foreground font-bold tracking-tight">
                        Joined {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "-"}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="space-y-32">
                  {/* AI Summary Section */}
                  <section id="summary" className="space-y-6 scroll-mt-24">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-black text-foreground tracking-tight">AI 분석 요약</h3>
                    </div>
                    <div className="bg-white border border-border shadow-sm rounded-[32px] p-10 relative overflow-hidden group max-w-2xl">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <Sparkles className="w-32 h-32 text-primary" />
                      </div>
                      <p className="text-lg font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap relative z-10 antialiased">
                        {insight?.comment || "충분한 데이터가 쌓이면 AI가 당신의 성향을 분석해 드립니다."}
                      </p>
                    </div>
                  </section>

                  {/* Interests Chart */}
                  <section id="interests" className="space-y-8 scroll-mt-24">
                    <div className="flex items-center gap-3 text-foreground font-black text-xl tracking-tight">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h3>나의 관심 분야</h3>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[32px] p-8 lg:p-12 max-w-2xl group hover:shadow-md transition-all">
                    <div className="h-80 w-full px-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="rgba(0,0,0,0.03)" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            width={140}
                            tick={{ fill: 'currentColor', fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em' }}
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(var(--primary-rgb), 0.03)', radius: 12 }}
                            contentStyle={{ borderRadius: '20px', border: '1px solid rgba(var(--primary-rgb), 0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 700, padding: '12px 16px' }}
                          />
                          <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={32}>
                            {chartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={index === 0 ? 'var(--primary)' : 'rgba(var(--primary-rgb), 0.15)'} 
                                className="hover:opacity-80 transition-all duration-300"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </div>
                  </section>

                  {/* Deep Conversations */}
                  <section id="conversations" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                    <div className="flex items-center gap-3 text-foreground font-black text-xl tracking-tight">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3>깊이 탐구한 대화</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
                      {insight?.deepConversations?.map((conv, idx) => (
                        <button
                          key={idx}
                          onClick={() => navigate(`/?session=${conv.conversationId}`)}
                          className="w-full flex items-center justify-between p-6 bg-secondary/[0.25] hover:bg-secondary/[0.45] rounded-[24px] transition-all border border-transparent hover:border-border/60 group shadow-sm active:scale-[0.98]"
                        >
                          <span className="text-[16px] font-bold text-foreground/90 text-left line-clamp-1 flex-1 pr-4">{conv.title}</span>
                          <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1">
                            <ArrowUpRight className="w-5 h-5" />
                          </div>
                        </button>
                      )) || (
                        <div className="col-span-full py-20 text-center text-muted-foreground text-base font-medium italic bg-secondary/5 rounded-[40px] border-2 border-dashed border-border/30">
                          아직 기록된 깊은 대화가 없습니다.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Personality Spectrum */}
                  <section id="spectrum" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                    <div className="flex items-center gap-3 text-foreground font-black text-xl tracking-tight">
                      <LayoutDashboard className="w-5 h-5 text-primary" />
                      <h3>탐구 성향 분석</h3>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[40px] p-8 lg:p-12 max-w-2xl group">
                      {renderSpectrumBar(
                        "탐구의 목적", 
                        insight?.spectrums.whyVsHow || 50, 
                        "방법(How)", 
                        "이유(Why)", 
                        insight?.spectrumChanges.whyVsHow || null
                      )}
                      {renderSpectrumBar(
                        "사고의 방식", 
                        insight?.spectrums.emotionVsLogic || 50, 
                        "논리(Logic)", 
                        "감성(Emotion)", 
                        insight?.spectrumChanges.emotionVsLogic || null
                      )}
                      {renderSpectrumBar(
                        "몰입의 지점", 
                        insight?.spectrums.processVsResult || 50, 
                        "결과(Result)", 
                        "과정(Process)", 
                        insight?.spectrumChanges.processVsResult || null
                      )}
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
