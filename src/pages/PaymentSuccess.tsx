import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

const PaymentSuccess = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);

    const orderId = searchParams.get("orderId");
    const paymentKey = searchParams.get("paymentKey");
    const amount = searchParams.get("amount");
    const billingKey = searchParams.get("billingKey"); // 리다이렉트 시 전달되는 빌링키

    useEffect(() => {
        // billingKey를 읽는 즉시 URL에서 제거 (브라우저 히스토리 노출 방지)
        if (billingKey) {
            window.history.replaceState({}, '', '/payment-success');
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        // 1. 리다이렉트로 넘어온 빌링키 처리 (모바일 결제용)
        if (billingKey && !orderId) {
            const handleMobileSubscription = async () => {
                try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
                    const subscribeResponse = await fetch(`${API_BASE_URL}/.netlify/functions/subscribe`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: user.uid,
                            billingKey: billingKey,
                            userName: user.displayName || "소크라테스 AI 사용자",
                            userEmail: user.email || "",
                            userPhone: "010-0000-0000",
                        }),
                    });

                    const result = await subscribeResponse.json();
                    if (subscribeResponse.ok) {
                        toast.success("구독이 시작되었습니다!");
                        // Firestore 업데이트를 기다리거나 직접 상태 변경
                        setLoading(false);
                        setTimeout(() => navigate("/"), 2000);
                    } else {
                        toast.error(result.message || "구독 처리 중 오류가 발생했습니다.");
                        navigate("/payment-fail?message=" + encodeURIComponent(result.message || "구독 처리 실패"));
                    }
                } catch (error) {
                    console.error("Mobile redirect subscription failed:", error);
                    toast.error("결제 처리 중 예기치 못한 오류가 발생했습니다.");
                    navigate("/payment-fail");
                }
            };
            handleMobileSubscription();
            return;
        }

        // 2. 기존 방식 (웹훅 완료 대기)
        if (!orderId) return;

        // 웹훅이 Firestore를 업데이트할 때까지 감시합니다.
        const unsubscribe = onSnapshot(
            doc(db, "users", user.uid, "subscription", "current"),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.status === 'active' && data.plan === 'pro') {
                        toast.success("구독 결제가 확인되었습니다!");
                        setLoading(false);
                        // 약간의 지연 후 홈으로 이동하여 성공 메시지를 볼 수 있게 함
                        setTimeout(() => navigate("/"), 2000);
                    }
                }
            },
            (error) => {
                console.error("Error listening to subscription:", error);
                toast.error("결제 상태를 확인하는 중 오류가 발생했습니다.");
            }
        );

        // 일정 시간(예: 30초) 동안 업데이트가 없으면 수동 확인 안내
        const timeoutId = setTimeout(() => {
            if (loading) {
                setLoading(false);
                toast.error("결제 확인 시간이 초과되었습니다. 잠시 후 홈에서 확인해 주세요.");
                setTimeout(() => navigate("/"), 3000);
            }
        }, 30000);

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [user, orderId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-zinc-950">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-slate-500">결제 정보를 확인하고 있습니다...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 p-4">
            <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">결제가 완료되었습니다!</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        이제 Socrates AI Pro의 모든 기능을 무제한으로 체험해 보세요.
                    </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 text-left text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-500">주문 번호</span>
                        <span className="font-medium">{orderId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">결제 금액</span>
                        <span className="font-medium">₩{Number(amount).toLocaleString()}</span>
                    </div>
                </div>

                <Button
                    onClick={() => navigate("/")}
                    className="w-full py-6 text-base font-bold rounded-xl"
                >
                    시작하기
                </Button>
            </div>
        </div>
    );
};

export default PaymentSuccess;
