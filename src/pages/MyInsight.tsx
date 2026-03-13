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
  Lock, 
  ArrowLeft, 
  User, 
  CreditCard, 
  TrendingUp, 
  MessageSquare, 
  LayoutDashboard,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { UserSettings } from "@/utils/userProfile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MyInsight = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<{ count: number, limit: number, resetAt: any } | null>(null);

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

  useEffect(() => {
    const fetchUsage = async () => {
      if (user) {
        const usageRef = doc(db, 'users', user.uid, 'usage', 'current');
        const usageDoc = await getDoc(usageRef);
        if (usageDoc.exists()) {
          setUsageData(usageDoc.data() as any);
        }
      }
    };
    fetchUsage();
  }, [user]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const conversationCount = profile?.conversationCount || 0;
  const isLocked = conversationCount < 10;
  const insight = profile?.insight;

  // Formatting categories for Recharts
  const chartData = insight?.categories?.map(cat => ({
    name: cat.name,
    count: cat.count
  })) || [];

  const renderSpectrumBar = (label: string, value: number, leftLabel: string, rightLabel: string, change: number | null) => (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {change !== null && change !== 0 && (
          <span className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded",
            change > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          )}>
            {change > 0 ? `+${change}` : change}
          </span>
        )}
      </div>
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="absolute top-0 bottom-0 bg-primary transition-all duration-1000 ease-out"
          style={{ 
            left: `${Math.min(50, value)}%`, 
            right: `${100 - Math.max(50, value)}%` 
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-border" />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );

  // Usage calculation

  const usagePercent = usageData ? Math.min(100, Math.round((usageData.count / usageData.limit) * 100)) : 0;
  
  const getRemainingTime = () => {
    if (!usageData?.resetAt) return "계산 중...";
    const resetDate = usageData.resetAt.toDate();
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    if (diffMs < 0) return "곧 초기화됨";
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs} hr ${diffMins} min`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="font-bold text-lg">나의 인사이트</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* 1. Profile Header */}
        <section className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border-2 border-primary/10">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ""} className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-primary/40" />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{user?.displayName || "Socrates User"}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                isPro ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
              )}>
                {isPro ? "PRO 멤버십" : "프리 플랜"}
              </span>
              <span className="text-sm text-muted-foreground">
                가입일: {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "-"}
              </span>
            </div>
          </div>
        </section>

        {/* 2. Simplified Usage Section */}
        <section className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 space-y-8 shadow-sm">
          <h3 className="text-lg font-bold text-foreground">Plan usage limits</h3>
          
          <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-6 sm:gap-12">
            {/* Label Column */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Current session</p>
              <p className="text-xs text-muted-foreground">
                Resets in {getRemainingTime()}
              </p>
            </div>

            {/* Progress Bar Column */}
            <div className="w-full">
              <div className="h-4 bg-secondary/50 rounded-full border border-border/50 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {/* Percentage Column */}
            <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {usagePercent}% used
            </div>
          </div>
        </section>

        {/* Insight Sections with Lock/Blur Logic */}
        <div className="relative space-y-6 pb-20">
          {isLocked && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-40 bg-background/10 backdrop-blur-[2px]">
              <div className="sticky top-1/2 -translate-y-1/2 w-full max-w-sm bg-card/95 border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6 border-primary/20">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold">인사이트 분석 중</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    대화 {10 - conversationCount}번 더 하면<br />
                    당신만을 위한 AI 인사이트가 열려요.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-primary">
                    <span>진행도</span>
                    <span>{conversationCount} / 10</span>
                  </div>
                  <Progress value={(conversationCount / 10) * 100} className="h-2" />
                </div>
                <Button onClick={() => navigate("/")} className="w-full h-12 rounded-xl font-bold">
                  대화하러 가기
                </Button>
              </div>
            </div>
          )}

          <div className={cn("space-y-6 transition-all duration-500", isLocked && "opacity-30 blur-sm pointer-events-none")}>
            {/* 3. Interests (Categories) */}
            <section className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 text-foreground font-bold text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3>나의 관심 분야</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100}
                      tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : 'rgba(var(--primary-rgb), 0.4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 4. Deep Conversations */}
            <section className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 text-foreground font-bold text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3>깊이 탐구한 대화</h3>
              </div>
              <div className="space-y-3">
                {insight?.deepConversations?.map((conv, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/?session=${conv.conversationId}`)}
                    className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 rounded-2xl transition-all border border-transparent hover:border-border group"
                  >
                    <span className="text-sm font-medium text-foreground text-left line-clamp-1">{conv.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                )) || (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    아직 깊은 대화 기록이 없어요.
                  </div>
                )}
              </div>
            </section>

            {/* 5. Personality Spectrum */}
            <section className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 space-y-8 shadow-sm">
              <div className="flex items-center gap-3 text-foreground font-bold text-lg">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                <h3>탐구 성향 분석</h3>
              </div>
              <div className="space-y-8">
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

            {/* 6. AI Comment */}
            <section className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-20 h-20 text-primary" />
              </div>
              <div className="relative space-y-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  AI 분석 요약
                </span>
                <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                  {insight?.comment || "충분한 데이터가 쌓이면 AI가 당신의 성향을 분석해 드립니다."}
                </p>
              </div>
            </section>

            {/* 7. Subscription Management */}
            <section className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-foreground">구독 관리</h4>
                <p className="text-sm text-muted-foreground">현재 플랜: <span className="text-primary font-bold">{isPro ? "Pro Member" : "Free Starter"}</span></p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate("/pricing")}
                className="rounded-xl px-6 h-11 border-border bg-transparent hover:bg-secondary"
              >
                멤버십 상세 보기
              </Button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyInsight;
