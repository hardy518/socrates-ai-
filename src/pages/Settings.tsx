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
  Settings as SettingsIcon,
  ArrowLeft,
  LogOut,
  UserX,
  ChevronRight,
  ShieldCheck,
  Bell,
  ExternalLink,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import { useUsageLimit } from "@/hooks/useUsageLimit";

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
  const [activeTab, setActiveTab] = useState("account");
  const [profile, setProfile] = useState<UserSettings | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  
  const { remainingCount } = useUsageLimit();

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

          // Fetch payment history
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
      // 1. Check if has active subscription
      if (subscription?.status === 'active') {
        toast.error("구독을 먼저 해지해주세요.");
        setIsDeletingAccount(false);
        return;
      }

      const userId = user.uid;
      const batch = writeBatch(db);

      // 2. Anonymize conversations
      const convsRef = collection(db, "conversations");
      const q = query(convsRef, where("userId", "==", userId));
      const convSnapshot = await getDocs(q);
      convSnapshot.forEach(doc => {
        batch.update(doc.ref, { userId: null });
      });

      // 3. Delete user data and sub-collections (simplified)
      // Note: Full sub-collection deletion usually requires recursive logic,
      // here we do a basic cleanup for the known documents.
      const userRef = doc(db, "users", userId);
      const subRef = doc(db, "users", userId, "subscription", "current");
      const usageRef = doc(db, "users", userId, "usage", "current");
      
      batch.delete(subRef);
      batch.delete(usageRef);
      batch.delete(userRef);

      await batch.commit();

      // 4. Delete Auth user
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
      // Slack alert would go here in production
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
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
          redirectUrl: isMobile ? redirectUrl : undefined,
          customer: {
              id: user.uid,
              fullName: user?.displayName || "User",
              email: user.email || undefined,
          },
      });

      if (isMobile) return;

      if (response.code !== undefined) {
          toast.error(`카드 등록 중 오류가 발생했습니다: ${response.message}`);
          return;
      }

      const { billingKey } = response;
      
      // Get card details from PortOne or extract from response if provided by V2
      // For simplicity in this UI-side update, we might need a small netlify function 
      // or extract brand/last4 if PortOne V2 response includes it.
      // Usually, we'd call a netlify function to safely update.
      
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
  const limit = isPro ? 200 : 5;
  const usedCount = limit - remainingCount;
  const usagePercent = Math.min(100, Math.round((usedCount / limit) * 100));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="font-bold text-lg">설정</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-8 min-w-max">
              <TabsTrigger value="account" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-semibold transition-all">계정</TabsTrigger>
              <TabsTrigger value="subscription" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-semibold transition-all">구독</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-semibold transition-all">결제 내역</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 py-3 font-semibold transition-all">설정</TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Account Tab */}
          <TabsContent value="account" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <section className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-600/10 flex items-center justify-center border border-primary/10">
                    <User className="w-8 h-8 text-primary" />
                 </div>
                 <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">이메일 계정</p>
                    <p className="text-lg font-bold text-foreground">{user?.email}</p>
                 </div>
              </div>
            </section>

            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="w-full h-14 rounded-2xl justify-between px-6 border-border hover:bg-secondary group"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                  <span className="font-semibold text-foreground">로그아웃</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>

              <div className="pt-4">
                <Button 
                  disabled={isPro}
                  variant="ghost" 
                  onClick={() => setDeleteModalOpen(true)}
                  className="w-full h-14 rounded-2xl justify-between px-6 text-destructive hover:text-destructive hover:bg-destructive/10 group decoration-destructive/30"
                >
                  <div className="flex items-center gap-3">
                    <UserX className="w-5 h-5" />
                    <span className="font-semibold">회원 탈퇴</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-destructive/50" />
                </Button>
                {isPro && (
                  <p className="text-xs text-muted-foreground px-6 mt-2 leading-relaxed">
                    구독을 먼저 해지한 후 탈퇴할 수 있어요.<br />
                    결제 내역 탭에서 구독을 취소해주세요.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 2. Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
            <section className="bg-card border border-border rounded-3xl p-8 space-y-8 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    isPro ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                  )}>
                    {isPro ? "Pro 플랜" : "프리 플랜"}
                  </span>
                  <h3 className="text-3xl font-black text-foreground">
                    {isPro ? "사용 중인 멤버십" : "무제한 대화의 시작"}
                  </h3>
                </div>
                {isPro && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">결제 주기</p>
                    <p className="font-bold text-foreground">월간</p>
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-foreground">이번 달 사용량</span>
                  </div>
                  <Progress value={usagePercent} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {isPro ? "Pro 플랜 (월 200회) 기준" : "무료 플랜 (일 5회) 기준"}
                  </p>
                </div>

                {isPro && (
                  <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">다음 결제 예정일</p>
                    <p className="text-lg font-bold text-foreground">
                      {subscription?.nextScheduledAt ? subscription.nextScheduledAt.toDate().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' }) : "-"}
                    </p>
                  </div>
                )}

                {!isPro && (
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20"
                  >
                    Pro로 업그레이드
                  </Button>
                )}
              </div>
            </section>
          </TabsContent>

          {/* 3. Payment Histroy Tab */}
          <TabsContent value="billing" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
            {/* Card Info */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                결제 수단
              </h3>
              <div className="bg-card border border-border rounded-3xl p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-secondary rounded-md flex items-center justify-center border border-border">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    {subscription?.cardLast4 ? (
                      <>
                        <p className="text-sm font-bold text-foreground">
                          {subscription.cardBrand} •••• {subscription.cardLast4}
                        </p>
                        <p className="text-xs text-muted-foreground">정기 결제 수단</p>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-foreground">등록된 결제수단이 없습니다</p>
                    )}
                  </div>
                </div>
                {isPro && (
                  <Button onClick={handleUpdateCard} variant="outline" className="rounded-xl font-semibold border-border hover:bg-secondary">
                    수정
                  </Button>
                )}
              </div>
            </section>

            {/* Invoices */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Invoices
              </h3>
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
                      <tr>
                        <th className="px-6 py-4 font-bold">Date</th>
                        <th className="px-6 py-4 font-bold">Total</th>
                        <th className="px-6 py-4 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {payments.length > 0 ? (
                        payments.map((payment) => (
                          <tr key={payment.paymentId} className="hover:bg-secondary/10 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">
                              {payment.paidAt?.toDate().toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              ₩{payment.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase">
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground italic">
                            결제 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Cancellation */}
            {isPro && (
              <section className="pt-4">
                <button 
                  onClick={() => setCancelModalOpen(true)}
                  className="text-sm font-bold text-destructive hover:underline transition-all"
                >
                  Cancel plan
                </button>
              </section>
            )}
          </TabsContent>

          {/* 4. General Settings Tab */}
          <TabsContent value="settings" className="space-y-8 focus-visible:outline-none focus-visible:ring-0">
            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                이용 설정
              </h3>
              <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  {/* Label Column */}
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">인사이트 알림</p>
                    <p className="text-xs text-muted-foreground">인사이트 준비 완료 시 토스트 메시지를 보여줍니다.</p>
                  </div>
                  <Switch 
                     checked={profile?.insightNotification}
                     onCheckedChange={handleToggleNotification}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                법적 고지
              </h3>
              <div className="bg-card border border-border rounded-3xl overflow-hidden divide-y divide-border shadow-sm">
                <Link to="/settings/terms" className="flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors">
                  <span className="text-sm font-medium">서비스 이용약관</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link to="/settings/privacy" className="flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors">
                  <span className="text-sm font-medium">개인정보처리방침</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link to="/settings/refund" className="flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors">
                  <span className="text-sm font-medium">취소 및 환불 규정</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Link>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </main>

      {/* Account Deletion Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">정말 탈퇴하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2">
              탈퇴하면 모든 계정 정보와 인사이트가 즉시 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 pt-4">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              className="w-full bg-destructive hover:bg-destructive/90 text-white rounded-2xl h-12 font-bold"
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? "처리 중..." : "탈퇴"}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full border-none hover:bg-secondary rounded-2xl h-12 font-bold">취소</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscription Cancellation Dialog */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-center">구독을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-2 leading-relaxed text-sm">
              구독을 취소하면 다음 결제일부터 자동 결제가 중단됩니다.<br />
              현재 결제 기간 만료일까지 Pro 기능을 계속 이용할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 pt-4">
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleCancelSubscription(); }}
              className="w-full bg-destructive hover:bg-destructive/90 text-white rounded-2xl h-12 font-bold"
            >
              구독 취소
            </AlertDialogAction>
            <AlertDialogCancel className="w-full border-none hover:bg-secondary rounded-2xl h-12 font-bold">닫기</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
