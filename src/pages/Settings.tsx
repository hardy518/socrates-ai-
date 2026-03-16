import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getUserSettings, setUserSettings, UserSettings } from "@/utils/userProfile";
import { getSubscription, Subscription, deleteSubscription } from "@/utils/subscription";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { 
  User, 
  CreditCard, 
  History, 
  LogOut,
  UserX,
  ChevronRight,
  ShieldCheck,
  Bell,
  ExternalLink,
  Plus,
  Menu,
  Sparkles,
  ArrowUpRight,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { useChatStorage } from "@/hooks/useChatStorage";
import { useIsMobile } from "@/hooks/use-mobile";

declare global {
  interface Window {
    PortOne: any;
    ChannelIO?: any;
  }
}

interface PaymentHistory {
  paymentId: string;
  amount: number;
  status: string;
  cardLast4: string;
  cardBrand: string;
  paidAt: any;
}

const Settings = () => {
  const { user, signOut, reauthenticateWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobile);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const { shortTermUsage, longTermUsage, isLoading: usageLoading, checkUsage } = useUsageLimit();
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
        try {
          const [settings, subData] = await Promise.all([
            getUserSettings(user.uid),
            getSubscription(user.uid)
          ]);
          setProfile(settings);
          setSubscription(subData);

          const paymentsRef = collection(db, "users", user.uid, "payments");
          const q = query(paymentsRef, orderBy("paidAt", "desc"));
          const snapshot = await getDocs(q);
          const paymentsData = snapshot.docs.map(doc => doc.data() as PaymentHistory);
          setPayments(paymentsData);
        } catch (error) {
          console.error("Error fetching settings data:", error);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setIsSidebarCollapsed(isMobile);
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
      toast.success("로그아웃되었습니다.");
    } catch (error) {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);

    try {
      if (subscription?.status === 'active') {
        toast.error("구독을 먼저 해지해주세요.");
        setIsDeletingAccount(false);
        return;
      }

      const userId = user.uid;
      const batch = writeBatch(db);

      const convsRef = collection(db, "conversations");
      const q = query(convsRef, where("userId", "==", userId));
      const convSnapshot = await getDocs(q);
      convSnapshot.forEach(doc => {
        batch.update(doc.ref, { userId: null });
      });

      const userRef = doc(db, "users", userId);
      const subRef = doc(db, "users", userId, "subscription", "current");
      const usageRef = doc(db, "users", userId, "usage", "current");
      
      batch.delete(subRef);
      batch.delete(usageRef);
      batch.delete(userRef);

      await batch.commit();

      try {
        await user.delete();
      } catch (authError: any) {
        if (authError.code === 'auth/requires-recent-login') {
          try {
            await reauthenticateWithGoogle();
            await user.delete();
          } catch (reauthError) {
            toast.error("보안을 위해 재로그인이 필요해요");
            return;
          }
        } else {
          throw authError;
        }
      }

      toast.success("탈퇴 처리가 완료되었습니다.");
      navigate("/");
    } catch (error) {
      console.error("Account deletion failed:", error);
      toast.error("처리 중 오류가 발생했어요. 고객센터로 문의해주세요.");
      if (window.ChannelIO) window.ChannelIO('openChat');
    } finally {
      setIsDeletingAccount(false);
      setDeleteModalOpen(false);
    }
  };

  const handleToggleNotification = async (checked: boolean) => {
    if (!user) return;
    try {
      await setUserSettings(user.uid, { insightNotification: checked });
      setProfile(prev => prev ? { ...prev, insightNotification: checked } : null);
    } catch (error) {
      toast.error("설정 저장에 실패했습니다.");
    }
  };

  const handleUpdateCard = async () => {
    if (!user) return;
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const redirectUrl = `${window.location.origin}/payment-success`;

      const response = await (window as any).PortOne.requestIssueBillingKey({
          storeId: import.meta.env.VITE_PORTONE_STORE_ID,
          channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
          issueId: crypto.randomUUID(),
          billingKeyMethod: "CARD",
          issueName: "소크라테스 AI 결제 수단 변경",
          offerPeriod: {
              interval: "1m",
          },
          redirectUrl: isMobileDevice ? redirectUrl : undefined,
          customer: {
              id: user.uid,
              fullName: user?.displayName || "User",
              email: user.email || undefined,
          },
      });

      if (isMobileDevice) return;

      if (response.code !== undefined) {
          toast.error(`카드 등록 중 오류가 발생했습니다: ${response.message}`);
          return;
      }

      const { billingKey } = response;
      const updateResponse = await fetch('/.netlify/functions/updateBillingKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid, billingKey }),
      });

      if (updateResponse.ok) {
        const result = await updateResponse.json();
        setSubscription(prev => prev ? { 
          ...prev, 
          billingKey, 
          cardLast4: result.cardLast4 || prev.cardLast4,
          cardBrand: result.cardBrand || prev.cardBrand
        } : null);
        toast.success("카드가 변경됐어요");
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Card update failed:", error);
      toast.error("오류가 발생했어요. 고객센터로 문의해주세요.");
      if (window.ChannelIO) window.ChannelIO('openChat');
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription) return;
    try {
      const response = await fetch('/.netlify/functions/cancelSubscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (response.ok) {
        setSubscription(prev => prev ? { ...prev, status: 'cancelled' } : null);
        toast.success("구독이 취소됐어요.");
      } else {
        throw new Error("Cancellation failed");
      }
    } catch (error) {
      toast.error("오류가 발생했어요. 고객센터로 문의해주세요.");
      if (window.ChannelIO) window.ChannelIO('openChat');
    } finally {
      setCancelModalOpen(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPro = subscription?.status === 'active';

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
    { id: "account", label: "계정 정보" },
    { id: "subscription", label: "멤버십 및 사용량" },
    { id: "billing", label: "결제 관리" },
    { id: "settings", label: "알림 설정" },
    { id: "legal", label: "법적 고지" },
    { id: "support", label: "계정 관리" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-black">
      {/* Sidebar Desktop */}
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
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 h-14 shrink-0 sm:hidden">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-base">설정</h1>
            </div>
            <button 
              onClick={() => navigate("/")}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-16">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
              
              {/* Left Section Navigation */}
              <aside className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-12 space-y-8">
                  <h2 className="text-2xl font-black text-foreground/90 px-3 tracking-tight">Settings</h2>
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
                
                {/* 1. Account Info */}
                <section id="account" className="space-y-6 scroll-mt-24">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-foreground tracking-tight">계정 정보</h3>
                    <p className="text-sm font-medium text-muted-foreground">로그인된 계정 정보와 보안 설정을 관리하세요.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 max-w-2xl">
                    <div className="bg-white border border-border shadow-sm rounded-[32px] p-8 flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <User className="w-7 h-7 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">이메일 계정</p>
                        <p className="text-xl font-bold text-foreground">{user?.email}</p>
                      </div>
                    </div>

                  </div>
                </section>

                {/* 2. Membership & Usage Tracking */}
                <section id="subscription" className="space-y-6 scroll-mt-24 pt-16 border-t border-border">
                  <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-foreground tracking-tight">Usage limits</h3>
                      <p className="text-sm font-medium text-muted-foreground">현재 플랜의 대화 가능 횟수와 초기화 시간을 관리하세요.</p>
                    </div>
                    <span className={cn(
                      "px-5 py-2 rounded-full text-[13px] font-black uppercase tracking-widest shadow-sm",
                      isPro ? "bg-primary text-white" : "bg-black/5 text-muted-foreground"
                    )}>
                      {isPro ? "PRO Member" : "Free Plan"}
                    </span>
                  </div>

                  <div className="bg-white border border-border shadow-sm rounded-[32px] p-8 lg:p-10 relative overflow-hidden group max-w-2xl">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Sparkles className="w-32 h-32 text-primary" />
                    </div>
                    
                    <div className="space-y-12 relative z-10">
                      {/* Short-term limit */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center group">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-foreground/70 uppercase tracking-widest">Current limits</p>
                            <p className="text-xs text-muted-foreground font-medium">Starts when a message is sent</p>
                          </div>
                          <span className="text-sm font-bold text-primary">{getUsagePercent(shortTermUsage)}% USED</span>
                        </div>
                        <Progress value={getUsagePercent(shortTermUsage)} className="h-2.5 bg-primary/10" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                          {isPro ? "WEEKLY LIMIT (50 SESSIONS)" : "DAILY LIMIT (5 SESSIONS)"}
                        </p>
                      </div>

                      {/* Long-term limit */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center group">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-foreground/70 uppercase tracking-widest">{isPro ? "Monthly limits" : "Weekly limits"}</p>
                            <p className="text-xs text-muted-foreground font-medium uppercase">Resets {formatResetDate(longTermUsage?.resetAt)}</p>
                          </div>
                          <span className="text-sm font-bold text-primary">{getUsagePercent(longTermUsage)}% USED</span>
                        </div>
                        <Progress value={getUsagePercent(longTermUsage)} className="h-2.5 bg-primary/10" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                          {isPro ? "MONTHLY LIMIT (200 SESSIONS)" : "WEEKLY LIMIT (20 SESSIONS)"}
                        </p>
                      </div>

                      {isPro ? (
                        <div className="p-6 bg-white/40 backdrop-blur-sm rounded-[24px] border border-primary/10">
                          <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">다음 결제 예정일</p>
                          <p className="text-xl font-bold text-foreground">
                            {subscription?.nextScheduledAt ? subscription.nextScheduledAt.toDate().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' }) : "-"}
                          </p>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => navigate('/pricing')}
                          className="w-full h-16 rounded-[24px] bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transform transition-transform active:scale-[0.98]"
                        >
                          Pro 멤버십 시작하기
                          <Sparkles className="w-5 h-5 ml-2 fill-white" />
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                {/* 3. Billing & Payments */}
                <section id="billing" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <div className="space-y-8 max-w-2xl">
                    <div className="flex items-center gap-4 text-foreground font-black text-xl tracking-tight">
                      <CreditCard className="w-6 h-6 text-primary" />
                      <h3>결제 수단</h3>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[32px] p-8 flex items-center justify-between group">
                      <div className="flex items-center gap-5">
                        {subscription?.cardLast4 && (
                          <div className="w-16 h-12 bg-white rounded-xl flex items-center justify-center border border-border shadow-sm">
                            <CreditCard className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="space-y-1">
                          {subscription?.cardLast4 ? (
                            <>
                              <p className="text-lg font-bold text-foreground">
                                {subscription.cardBrand} •••• {subscription.cardLast4}
                              </p>
                              <p className="text-xs font-black text-primary/60 uppercase tracking-widest">정기 결제 수단</p>
                            </>
                          ) : (
                            <p className="text-base font-bold text-muted-foreground">등록된 결제 수단이 없습니다</p>
                          )}
                        </div>
                      </div>
                      {isPro && (
                        <Button 
                          onClick={handleUpdateCard} 
                          variant="outline" 
                          className="rounded-2xl h-11 px-6 font-black text-xs border-border/80 hover:bg-white hover:shadow-md transition-all uppercase tracking-widest"
                        >
                          수정
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 text-foreground font-black text-xl tracking-tight">
                      <History className="w-6 h-6 text-primary" />
                      <h3>결제 내역</h3>
                    </div>
                    
                    <div className="bg-white border border-border/50 rounded-[32px] overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[15px] text-left">
                          <thead className="text-[11px] text-muted-foreground font-black uppercase tracking-[0.15em] bg-secondary/5 border-b border-border/30">
                            <tr>
                              <th className="px-8 py-6">Date</th>
                              <th className="px-8 py-6">Amount</th>
                              <th className="px-8 py-6 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20">
                            {payments.length > 0 ? (
                              payments.map((payment) => (
                                <tr key={payment.paymentId} className="hover:bg-secondary/5 transition-colors group">
                                  <td className="px-8 py-6 font-bold text-foreground">
                                    {payment.paidAt?.toDate().toLocaleDateString('ko-KR')}
                                  </td>
                                  <td className="px-8 py-6 text-muted-foreground font-medium">
                                    ₩{payment.amount.toLocaleString()}
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                    <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] font-black uppercase tracking-widest">
                                      {payment.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-8 py-20 text-center text-muted-foreground font-medium italic bg-secondary/[0.02]">
                                  기록된 결제 내역이 없습니다.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {isPro && (
                    <div className="pt-4 px-4">
                      <button 
                        onClick={() => setCancelModalOpen(true)}
                        className="text-[13px] font-bold text-destructive/70 hover:text-destructive hover:underline underline-offset-4 transition-all"
                      >
                        구독 해지하기
                      </button>
                    </div>
                  )}
                </section>

                {/* 4. General Settings */}
                <section id="settings" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center gap-4 text-foreground font-black text-xl tracking-tight">
                      <Bell className="w-6 h-6 text-primary" />
                      <h3>알림 설정</h3>
                    </div>
                    
                    <div className="bg-white border border-border shadow-sm rounded-[32px] p-8 flex items-center justify-between">
                      <div className="space-y-2">
                        <p className="text-[16px] font-bold text-foreground">인사이트 준비 완료 알림</p>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed">새로운 AI 분석 결과가 도착하면 화면 상단에 알림을 표시합니다.</p>
                      </div>
                      <Switch 
                        className="data-[state=checked]:bg-primary"
                        checked={profile?.insightNotification}
                        onCheckedChange={handleToggleNotification}
                      />
                    </div>
                  </div>
                </section>

                {/* 5. Legal */}
                <section id="legal" className="space-y-6 scroll-mt-24 pt-16 border-t border-border">
                  <div className="flex items-center gap-4 text-foreground font-black text-xl tracking-tight">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    <h3>법적 고지</h3>
                  </div>
                  
                  <div className="bg-white border border-border shadow-sm rounded-[32px] overflow-hidden divide-y divide-border/20 max-w-2xl">
                    <Link to="/settings/terms" className="flex items-center justify-between p-7 hover:bg-secondary/10 transition-all group">
                      <span className="text-[15px] font-bold group-hover:text-primary transition-colors">서비스 이용약관</span>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary/70 transition-all" />
                    </Link>
                    <Link to="/settings/privacy" className="flex items-center justify-between p-7 hover:bg-secondary/10 transition-all group">
                      <span className="text-[15px] font-bold group-hover:text-primary transition-colors">개인정보처리방침</span>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary/70 transition-all" />
                    </Link>
                    <Link to="/settings/refund" className="flex items-center justify-between p-7 hover:bg-secondary/10 transition-all group">
                      <span className="text-[15px] font-bold group-hover:text-primary transition-colors">취소 및 환불 규정</span>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary/70 transition-all" />
                    </Link>
                  </div>
                </section>
                
                {/* 6. Account Support */}
                <section id="support" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center gap-4 text-foreground font-black text-xl tracking-tight">
                      <ShieldAlert className="w-6 h-6 text-primary" />
                      <h3>계정 관리</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button 
                        variant="ghost" 
                        onClick={handleLogout}
                        className="w-full h-16 rounded-[24px] justify-between px-8 bg-secondary/10 hover:bg-secondary/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                          <span className="font-bold text-foreground">로그아웃</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                      </Button>

                      <div className="pt-2">
                        <Button 
                          disabled={isPro}
                          variant="ghost" 
                          onClick={() => setDeleteModalOpen(true)}
                          className="w-full h-16 rounded-[24px] justify-between px-8 text-destructive/80 hover:text-destructive hover:bg-destructive/5 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <UserX className="w-5 h-5" />
                            <span className="font-bold">회원 탈퇴</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-destructive/30" />
                        </Button>
                        {isPro && (
                          <p className="text-[13px] text-muted-foreground font-medium px-8 mt-4 leading-relaxed bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                            구독이 활성화된 상태에서는 탈퇴할 수 없습니다. <br />
                            먼저 구독을 해지한 후 다시 시도해 주세요.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="rounded-[40px] max-w-[400px] p-10 border-none shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-2xl font-black text-center tracking-tight">정말 떠나시나요?</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium leading-relaxed text-muted-foreground">
              탈퇴하시면 그동안 나눈 대화 기록과 <br /> 모든 AI 인사이트가 즉시 영구 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="flex-1 border-none bg-secondary/50 hover:bg-secondary rounded-2xl h-14 font-black transition-all">취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-2xl h-14 font-black transition-all"
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? "처리 중" : "탈퇴하기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent className="rounded-[40px] max-w-[400px] p-10 border-none shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-2xl font-black text-center tracking-tight">구독을 중단하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium leading-relaxed text-muted-foreground px-2">
              구독을 취소하면 다음 결제일부터 <br /> PRO 혜택이 사라지게 됩니다. <br />
              <span className="text-[11px] font-black uppercase text-primary tracking-widest block mt-4 bg-primary/5 p-2 rounded-xl">다시 한번 생각해보세요!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="flex-1 border-none bg-secondary/50 hover:bg-secondary rounded-2xl h-14 font-black transition-all">유지하기</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleCancelSubscription(); }}
              className="flex-1 bg-destructive/80 hover:bg-destructive text-white rounded-2xl h-14 font-black transition-all"
            >
              구독 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
