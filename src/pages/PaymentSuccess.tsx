import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { setProPlan } from "@/utils/subscription";
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

    useEffect(() => {
        const finalizePayment = async () => {
            if (user && orderId && paymentKey) {
                try {
                    // 실제 서비스라면 여기서 백엔드에서 결제 승인(confirm) API를 호출해야 하지만,
                    // 유저의 요청대로 바로 Firebase에 플랜을 저장합니다.
                    await setProPlan(user.uid, {
                        paymentKey,
                        orderId
                    });
                    toast.success("Pro 구독이 시작되었어요!");
                } catch (error) {
                    console.error("Error updating subscription:", error);
                    toast.error("구독 정보 갱신 중 오류가 발생했습니다.");
                }
            }
            setLoading(false);
        };

        if (user) {
            finalizePayment();
        }
    }, [user, orderId, paymentKey]);

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
