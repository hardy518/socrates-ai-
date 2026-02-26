import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsPro } from "@/utils/subscription";
import { toast } from "sonner";
import { setProPlan } from "@/utils/subscription";

declare global {
    interface Window {
        PortOne: any;
    }
}

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
            const customerId = user.uid;

            const response = await window.PortOne.requestIssueBillingKey({
                storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
                issueId: crypto.randomUUID(),
                billingKeyMethod: "CARD",
                issueName: "소크라테스 AI Pro 정기구독",
                customer: {
                    customerId: customerId,
                    fullName: user.displayName || "User",
                    email: user.email || undefined,
                    phoneNumber: import.meta.env.VITE_TEST_PHONE_NUMBER || "01000000000",
                },
            });

            if (response.code !== undefined) {
                // Error occurred
                toast.error(`결제 준비 중 오류가 발생했습니다: ${response.message}`);
                return;
            }

            const { billingKey } = response;

            // Call backend to process initial payment and save billing key
            const subscribeResponse = await fetch('/.netlify/functions/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid,
                    billingKey: billingKey,
                }),
            });

            const result = await subscribeResponse.json();

            if (subscribeResponse.ok) {
                toast.success("구독이 시작되었습니다! 이제 Pro 기능을 이용하실 수 있습니다.");
                setIsPro(true);
                setTimeout(() => navigate("/"), 2000);
            } else {
                toast.error(result.message || "구독 처리 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("Payment issuance failed:", error);
            toast.error("결제 요청 중 예기치 못한 오류가 발생했습니다.");
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

                    {/* Starter Plan — hidden if already Pro */}
                    {!isPro && (
                        <div className="flex-1 max-w-[300px] p-8 rounded-[2rem] bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mb-4">무료</div>
                            <div className="mb-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white">₩0</span>
                                    <span className="text-slate-500 text-sm font-medium">/월</span>
                                </div>
                                <p className="text-slate-500 text-sm mt-1">먼저 경험해보세요</p>
                            </div>
                            <ul className="space-y-3 my-6 flex-1">
                                {["하루 5회 대화", "단계별 소크라테스 질문", "대화 영구 저장", "과거 대화 검색"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-500 text-sm">
                                        <span className="material-icons text-primary text-base">check_circle</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleBasicPlan}
                                className="w-full py-3 rounded-xl bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            >
                                무료로 시작하기
                            </button>
                        </div>
                    )}

                    {/* Pro Plan */}
                    <div className={`flex-1 max-w-[300px] p-8 rounded-[2rem] bg-white dark:bg-slate-900 border-2 border-primary flex flex-col relative shadow-[0_24px_48px_-8px_rgba(66,133,244,0.18)]`}>
                        {isPro ? (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg shadow-primary/40">
                                현재 사용 중
                            </div>
                        ) : (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 text-xs font-bold rounded-full">
                                추천
                            </div>
                        )}
                        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 self-start">Pro</div>
                        <div className="mb-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-900 dark:text-white">₩7,000</span>
                                <span className="text-slate-500 text-sm font-medium">/월</span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1">더 깊이 생각하고 싶을 때</p>
                        </div>
                        <ul className="space-y-3 my-6 flex-1">
                            {["무제한 대화", "단계별 소크라테스 질문", "대화 영구 저장", "과거 대화 검색"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-800 dark:text-slate-200 text-sm font-semibold">
                                    <span className="material-icons text-primary text-base">check_circle</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={handleProPlan}
                            disabled={isPro}
                            className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isPro ? "구독 중" : "Pro로 시작하기"}
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="flex-1 max-w-[300px] p-8 rounded-[2rem] bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                        <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mb-4">기관/기업</div>
                        <div className="mb-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">₩7,000</span>
                                <span className="text-slate-500 text-sm font-medium">/ 1인 · 월</span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1">조직을 위한 맞춤 솔루션</p>
                        </div>
                        <ul className="space-y-3 my-6 flex-1">
                            {["Pro보다 더 많은 사용량", "Pro의 모든 기능", "관리자 대시보드", "조직 멤버 관리", "데이터 내보내기", "전담 지원"].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-500 text-sm">
                                    <span className="material-icons text-primary text-base">check_circle</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => window.open('https://socratestutor.channel.io', '_blank')}
                            className="w-full py-3 rounded-xl bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                            도입 문의하기
                        </button>
                    </div>
                </div>

                {/* VAT Notice */}
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

