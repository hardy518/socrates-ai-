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
  ShieldAlert,
  Info
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
import { SubPageNav } from "@/components/SubPageNav";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { language, setLanguage, t } = useLanguage();
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
  const [activeSection, setActiveSection] = useState("account");
  
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
    const sectionIds = ['account', 'subscription', 'billing', 'settings', 'legal', 'support'];
    
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading]);

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
        toast.error(t('cancelSubFirst'));
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
            toast.error(t('reloginRequired'));
            return;
          }
        } else {
          throw authError;
        }
      }

      toast.success(t('withdrawSuccess'));
      navigate("/");
    } catch (error) {
      console.error("Account deletion failed:", error);
      toast.error(t('withdrawError'));
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
      toast.error(t('saveSettingsError'));
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
          issueName: t('paymentNameChange'),
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
          toast.error(t('cardRegError').replace('{message}', response.message));
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
        toast.success(t('cardChangeSuccess'));
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Card update failed:", error);
      toast.error(t('genericError'));
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
    return date.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { 
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
    { id: "account", label: t('account') },
    { id: "subscription", label: t('membership') },
    { id: "billing", label: t('invoices') },
    { id: "settings", label: t('notifications') },
    { id: "legal", label: t('legal') },
    { id: "support", label: t('actions') },
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
              <h1 className="font-medium text-base text-black">{t('settings')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate("/")}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
                aria-label={t('goToMain')}
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
              
              {/* Left Section Navigation */}
              <aside className="hidden lg:block w-48 shrink-0">
                <div className="sticky top-12 space-y-8">
                  <h2 className="text-2xl font-bold text-black px-3 tracking-tight">{t('settings')}</h2>
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
              <div className="flex-1 min-w-0 space-y-24">
                
                {/* 1. Account Info */}
                <section id="account" className="space-y-8 scroll-mt-24">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-black tracking-tight">{t('account')}</h3>
                  </div>
                  
                  <div className="space-y-2 py-2">
                    <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest">{t('emailAddress')}</p>
                    <p className="text-lg font-medium text-black">{user?.email}</p>
                  </div>
                </section>

                {/* 2. Membership & Usage Tracking */}
                <section id="subscription" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <div className="flex items-center justify-between gap-6 flex-wrap">
                    <h3 className="text-xl font-bold text-black tracking-tight">{t('membership')} & {t('usage')}</h3>
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest",
                      isPro ? "bg-primary text-white" : "bg-black/5 text-black/40"
                    )}>
                      {isPro ? t('proMember') : t('freePlan')}
                    </span>
                  </div>

                  <div className="space-y-10 py-2">
                    <div className="space-y-12">
                      {/* Short-term limit */}
                      <div className="space-y-4 max-w-2xl">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest">{t('currentLimits')}</p>
                          </div>
                          <span className="text-sm font-bold text-primary">{getUsagePercent(shortTermUsage)}% {t('used')}</span>
                        </div>
                        <Progress value={getUsagePercent(shortTermUsage)} className="h-1.5 bg-black/[0.03]" />
                        <p className="text-[11px] font-bold text-black/30 uppercase tracking-tight">
                          {isPro ? t('weeklyLimit') : t('dailyLimit')}
                        </p>
                      </div>

                      {/* Long-term limit */}
                      <div className="space-y-4 max-w-2xl">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest">{isPro ? t('monthlyLimits') : t('weeklyLimits')}</p>
                          </div>
                          <span className="text-sm font-bold text-primary">{getUsagePercent(longTermUsage)}% {t('used')}</span>
                        </div>
                        <Progress value={getUsagePercent(longTermUsage)} className="h-1.5 bg-black/[0.03]" />
                        <p className="text-[11px] font-bold text-black/30 uppercase tracking-tight">
                          {t('resets').replace('{date}', formatResetDate(longTermUsage?.resetAt))}
                        </p>
                      </div>

                      {isPro ? (
                        <div className="py-4 border-t border-border/50 max-w-2xl">
                          <p className="text-[11px] font-bold text-black/40 uppercase tracking-widest mb-2">{t('nextBillingDate')}</p>
                          <p className="text-lg font-medium text-black">
                            {subscription?.nextScheduledAt ? subscription.nextScheduledAt.toDate().toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { year:'numeric', month:'long', day:'numeric' }) : "-"}
                          </p>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => navigate('/pricing')}
                          className="w-full max-w-2xl h-14 rounded-2xl bg-black text-white font-bold text-base hover:bg-black/90 transition-all flex items-center justify-center gap-2"
                        >
                          {t('upgradeToPro')}
                          <Sparkles className="w-4 h-4 fill-white" />
                        </Button>
                      )}
                    </div>
                  </div>
                </section>

                {/* 3. Billing & Payments */}
                <section id="billing" className="space-y-16 scroll-mt-24 pt-16 border-t border-border">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-black tracking-tight">{t('paymentMethod')}</h3>
                    
                    <div className="flex items-center justify-between group py-2">
                      <div className="flex items-center gap-5">
                        <div className="space-y-1">
                          {subscription?.cardLast4 ? (
                            <>
                              <p className="text-lg font-medium text-black">
                                {subscription.cardBrand} •••• {subscription.cardLast4}
                              </p>
                              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('defaultPaymentMethod')}</p>
                            </>
                          ) : (
                            <p className="text-base font-medium text-black/40">{t('noPaymentMethod')}</p>
                          )}
                        </div>
                      </div>
                      {isPro && (
                        <Button 
                          onClick={handleUpdateCard} 
                          variant="link" 
                          className="p-0 h-auto font-bold text-[13px] text-black/60 hover:text-black transition-all underline underline-offset-4"
                        >
                          {t('edit')}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-xl font-bold text-black tracking-tight">{t('invoices')}</h3>
                    
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[14px] text-black font-medium border-b border-transparent">
                            <th className="pb-6 font-medium">{t('date')}</th>
                            <th className="pb-6 font-medium">{t('total')}</th>
                            <th className="pb-6 font-medium">{t('status')}</th>
                            <th className="pb-6 font-medium text-right">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="text-[15px]">
                          {payments.length > 0 ? (
                            payments.map((payment) => (
                              <tr key={payment.paymentId} className="group transition-colors">
                                <td className="py-4 text-black">
                                  {payment.paidAt?.toDate().toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="py-4 text-black">
                                  <div className="flex items-center gap-1.5">
                                    ₩{payment.amount.toLocaleString()}
                                    <Info className="w-3.5 h-3.5 text-black/30 hover:text-black/60 cursor-help transition-colors" />
                                  </div>
                                </td>
                                <td className="py-4 text-black">
                                  {payment.status === 'succeeded' ? t('paid') : payment.status}
                                </td>
                                <td className="py-4 text-right">
                                  <button className="text-black font-medium underline underline-offset-4 hover:text-primary transition-all">
                                    {t('view')}
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-muted-foreground font-medium italic">
                                {t('noHistory')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {isPro && (
                    <div className="pt-4 px-4">
                      <button 
                        onClick={() => setCancelModalOpen(true)}
                        className="text-[13px] font-bold text-destructive/70 hover:text-destructive hover:underline underline-offset-4 transition-all"
                      >
                        {t('cancelSubscription')}
                      </button>
                    </div>
                  )}
                </section>

                {/* 4. General Settings */}
                <section id="settings" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-black tracking-tight">{t('language')}</h3>
                    
                    <div className="flex items-center justify-between py-2 max-w-2xl">
                      <div className="space-y-1">
                        <p className="text-[16px] font-medium text-black">{language === 'ko' ? '한국어' : 'English'}</p>
                        <p className="text-sm text-black/50 leading-relaxed">
                          {language === 'ko' ? '기본 언어를 선택하세요.' : 'Select your preferred language.'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setLanguage('ko')}
                          className={cn(
                            "rounded-full px-4 font-bold text-[13px] transition-all",
                            language === 'ko' ? "bg-black text-white" : "text-black/40 hover:text-black hover:bg-black/5"
                          )}
                        >
                          한국어
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => setLanguage('en')}
                          className={cn(
                            "rounded-full px-4 font-bold text-[13px] transition-all",
                            language === 'en' ? "bg-black text-white" : "text-black/40 hover:text-black hover:bg-black/5"
                          )}
                        >
                          English
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 max-w-2xl border-t border-border/30 pt-6">
                      <div className="space-y-1">
                        <p className="text-[16px] font-medium text-black">{t('insightNotifications')}</p>
                        <p className="text-sm text-black/50 leading-relaxed">{t('insightNotificationDesc')}</p>
                      </div>
                      <Switch 
                        className="data-[state=checked]:bg-black"
                        checked={profile?.insightNotification}
                        onCheckedChange={handleToggleNotification}
                      />
                    </div>
                  </div>
                </section>

                {/* 5. Legal */}
                <section id="legal" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <h3 className="text-xl font-bold text-black tracking-tight">{t('legal')}</h3>
                  
                  <div className="divide-y divide-border/30 max-w-2xl">
                    <Link to="/settings/terms" className="flex items-center justify-between py-5 group">
                      <span className="text-[15px] font-medium group-hover:text-primary transition-colors">{t('termsOfService')}</span>
                      <ChevronRight className="w-4 h-4 text-black/20 group-hover:text-black/40 transition-all" />
                    </Link>
                    <Link to="/settings/privacy" className="flex items-center justify-between py-5 group">
                      <span className="text-[15px] font-medium group-hover:text-primary transition-colors">{t('privacyPolicy')}</span>
                      <ChevronRight className="w-4 h-4 text-black/20 group-hover:text-black/40 transition-all" />
                    </Link>
                    <Link to="/settings/refund" className="flex items-center justify-between py-5 group">
                      <span className="text-[15px] font-medium group-hover:text-primary transition-colors">{t('refundPolicy')}</span>
                      <ChevronRight className="w-4 h-4 text-black/20 group-hover:text-black/40 transition-all" />
                    </Link>
                  </div>
                </section>
                
                {/* 6. Account Support */}
                <section id="support" className="space-y-8 scroll-mt-24 pt-16 border-t border-border">
                  <div className="space-y-6 max-w-2xl">
                    <h3 className="text-xl font-bold text-black tracking-tight">{t('accountActions')}</h3>

                    <div className="flex flex-col gap-3">
                      <Button 
                        variant="ghost" 
                        onClick={handleLogout}
                        className="w-full h-16 rounded-[24px] justify-between px-8 bg-black/[0.03] hover:bg-black/[0.06] transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <LogOut className="w-5 h-5 text-black/40 group-hover:text-black" />
                          <span className="font-bold text-black">{t('logout')}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-black/20" />
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
                            <span className="font-bold">{t('deleteAccount')}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-destructive/20" />
                        </Button>
                        {isPro && (
                          <p className="text-[13px] text-black/40 font-medium px-8 mt-4 leading-relaxed bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                            {t('proDeleteNotice')}
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
            <AlertDialogTitle className="text-2xl font-black text-center tracking-tight">{t('deleteAccountTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium leading-relaxed text-muted-foreground">
              {t('deleteAccountDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="flex-1 border-none bg-secondary/50 hover:bg-secondary rounded-2xl h-14 font-black transition-all">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-2xl h-14 font-black transition-all"
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? t('processing') : t('withdraw')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent className="rounded-[40px] max-w-[400px] p-10 border-none shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-2xl font-black text-center tracking-tight">{t('cancelSubTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="text-center font-medium leading-relaxed text-muted-foreground px-2">
              {t('cancelSubDesc')} <br />
              <span className="text-[11px] font-black uppercase text-primary tracking-widest block mt-4 bg-primary/5 p-2 rounded-xl">{t('thinkAgain')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:flex-row gap-3 pt-6">
            <AlertDialogCancel className="flex-1 border-none bg-secondary/50 hover:bg-secondary rounded-2xl h-14 font-black transition-all">{t('keepSubscription')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleCancelSubscription(); }}
              className="flex-1 bg-destructive/80 hover:bg-destructive text-white rounded-2xl h-14 font-black transition-all"
            >
              {t('cancelSubAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
