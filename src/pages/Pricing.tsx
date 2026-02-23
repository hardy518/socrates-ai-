import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsPro } from "@/utils/subscription";
import { toast } from "sonner";
import { loadTossPayments } from "@tosspayments/payment-sdk";

const Pricing = () => {
    const { user, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fetchSubscription = async () => {
            console.log("Fetching subscription for user:", user?.uid, "Anonymous:", user?.isAnonymous);
            if (user && !user.isAnonymous) {
                try {
                    const proStatus = await checkIsPro(user.uid);
                    console.log("Pro status:", proStatus);
                    setIsPro(proStatus);
                } catch (error) {
                    console.error("Error checking pro status:", error);
                }
            } else {
                setIsPro(false);
            }
            setLoading(false);
        };

        fetchSubscription();
    }, [user]);

    // Handle automatic pro plan trigger from landing page
    useEffect(() => {
        if (!loading && searchParams.get('action') === 'pay-pro') {
            handleProPlan();
        }
    }, [loading, searchParams]);

    const handleBasicPlan = async () => {
        console.log("handleBasicPlan clicked. User:", user?.uid, "isPro:", isPro);
        if (!user || user.isAnonymous) {
            try {
                console.log("Triggering Google Login");
                await signInWithGoogle();
                setTimeout(() => navigate("/"), 500);
            } catch (error) {
                console.error("Login failed:", error);
                toast.error("로그인에 실패했습니다. 다시 시도해 주세요.");
            }
            return;
        }

        if (isPro) {
            console.log("User is Pro, navigating to /");
            setTimeout(() => navigate("/"), 500);
        } else {
            console.log("User is Free, navigating to /");
            setTimeout(() => navigate("/"), 500);
        }
    };

    const handleProPlan = async () => {
        console.log("handleProPlan clicked. User:", user?.uid, "isPro:", isPro);
        if (!user || user.isAnonymous) {
            try {
                console.log("Triggering Google Login for Pro");
                await signInWithGoogle();
                // 로그인 후 /pricing으로 돌아오도록 유도하거나, 
                // 간단히 홈으로 보낸 뒤 다시 들어오게 함 (요청대로 / 이동)
                setTimeout(() => navigate("/"), 500);
            } catch (error) {
                console.error("Login failed:", error);
                toast.error("로그인에 실패했습니다.");
            }
            return;
        }

        if (isPro) {
            toast.info("이미 Pro 플랜 사용 중입니다.");
            setTimeout(() => navigate("/"), 500);
            return;
        }

        try {
            const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
            if (!clientKey) {
                toast.error("결제 설정이 누락되었습니다. (VITE_TOSS_CLIENT_KEY)");
                return;
            }

            const tossPayments = await loadTossPayments(clientKey);
            const orderId = `ORDER_${Date.now()}_${user.uid}`;

            await tossPayments.requestPayment("카드", {
                amount: 9900,
                orderId: orderId,
                orderName: "Socrates AI Pro 플랜",
                successUrl: `${window.location.origin}/payment-success?orderId=${orderId}`,
                failUrl: `${window.location.origin}/payment-fail`,
            });
        } catch (error) {
            console.error("Payment request failed:", error);
            toast.error("결제 창을 여는 데 실패했습니다.");
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="font-sans bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 min-h-screen selection:bg-primary/10">
            {/* Back Button */}
            <Link
                to="/"
                className="fixed top-6 left-6 z-[60] flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary transition-all shadow-sm group"
            >
                <span className="material-icons text-xl group-hover:-translate-x-0.5 transition-transform">
                    arrow_back
                </span>
            </Link>

            <main className="max-w-5xl mx-auto px-4 py-12 md:py-16">
                {/* Hero Section */}
                <div className="text-center mb-10">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                        당신의 생각을 더 깊게
                    </h1>
                </div>

                {/* Pricing Cards Container */}
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 mb-16">
                    {/* Basic Plan - Hidden if Pro */}
                    {!isPro && (
                        <div className="flex-1 max-w-[300px] bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div className="mb-6">
                                <span className="inline-block px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full mb-3 uppercase tracking-wider font-mono">
                                    무료
                                </span>
                                <h2 className="text-xl font-bold mb-1">Basic</h2>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">₩0</span>
                                    <span className="text-slate-500 text-xs">/ 평생 무료</span>
                                </div>
                            </div>
                            <div className="flex-grow space-y-3 mb-6">
                                <div className="flex items-start gap-2.5">
                                    <span className="material-icons text-primary text-lg">check_circle</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        하루 2회 대화 세션
                                    </span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="material-icons text-primary text-lg">check_circle</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        5단계 심화 질문
                                    </span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="material-icons text-primary text-lg">check_circle</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        7일 대화 기록 보관
                                    </span>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <span className="material-icons text-primary text-lg">check_circle</span>
                                    <span className="text-sm text-slate-600 dark:text-slate-400">
                                        익명성 보장 대화
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleBasicPlan}
                                className="w-full py-3 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                무료로 시작하기
                            </button>
                        </div>
                    )}

                    {/* Pro Plan */}
                    <div className={`flex-1 max-w-[300px] bg-white dark:bg-slate-900 border-2 ${isPro ? 'border-primary' : 'border-primary/20'} rounded-2xl p-6 flex flex-col relative shadow-xl shadow-primary/5 hover:shadow-primary/10 transition-all`}>
                        {isPro ? (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 text-[10px] font-bold rounded-full shadow-lg shadow-primary/40">
                                현재 사용 중
                            </div>
                        ) : (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-0.5 text-[10px] font-bold rounded-full">
                                추천
                            </div>
                        )}
                        <div className="mb-6">
                            <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full mb-3 uppercase tracking-wider font-mono">
                                Pro
                            </span>
                            <h2 className="text-xl font-bold mb-1">Pro</h2>
                            <div className="flex flex-col">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">₩9,900</span>
                                    <span className="text-slate-500 text-xs">/ 월</span>
                                </div>
                                {!isPro && (
                                    <span className="text-primary text-xs font-semibold mt-1">
                                        첫 달은 ₩4,900으로 체험하세요
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex-grow space-y-3 mb-6">
                            <div className="flex items-start gap-2.5">
                                <span className="material-icons text-primary text-lg">check_circle</span>
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                                    무제한 대화 세션
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="material-icons text-primary text-lg">check_circle</span>
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                                    영구적 대화 히스토리 보관
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="material-icons text-primary text-lg">check_circle</span>
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                                    대화 내용 내보내기 & 검색
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="material-icons text-primary text-lg">check_circle</span>
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                                    주간 사고 분석 리포트 제공
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="material-icons text-primary text-lg">check_circle</span>
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                                    우선 순위 고객 지원
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleProPlan}
                            disabled={isPro}
                            className={`w-full py-3 bg-gradient-to-br from-primary via-primary to-blue-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isPro ? "구독 중" : "Pro로 시작하기"}
                        </button>
                    </div>
                </div>

                {/* VAT Notice Section */}
                <div className="max-w-2xl mx-auto text-center border-t border-slate-200 dark:border-slate-800 pt-8">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                        표시된 가격에는 부가세가 포함되어 있습니다.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Pricing;
