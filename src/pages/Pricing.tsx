import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkIsPro, getSubscription } from "@/utils/subscription";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

declare global {
    interface Window {
        PortOne: any;
    }
}

const Pricing = () => {
    const { user, signInWithGoogle } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [isPro, setIsPro] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const fetchSubscription = async () => {
            if (user && !user.isAnonymous) {
                try {
                    const [proStatus, sub] = await Promise.all([
                        checkIsPro(user.uid),
                        getSubscription(user.uid),
                    ]);
                    setIsPro(proStatus);
                    setSubscriptionStatus(sub?.status ?? null);
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
        if (!user || user.isAnonymous) {
            try {
                await signInWithGoogle();
                setTimeout(() => navigate("/"), 500);
            } catch (error) {
                console.error("Login failed:", error);
                toast.error(t('loginFailed'));
            }
            return;
        }

        setTimeout(() => navigate("/"), 500);
    };

    const handleProPlan = async () => {
        if (!user || user.isAnonymous) {
            try {
                await signInWithGoogle();
                setTimeout(() => navigate("/"), 500);
            } catch (error) {
                console.error("Login failed:", error);
                toast.error(t('loginFailed'));
            }
            return;
        }

        if (isPro && subscriptionStatus === 'active') {
            toast.info(t('alreadyPro'));
            setTimeout(() => navigate("/"), 500);
            return;
        }

        try {
            // Re-verify status just before showing payment window for maximum safety
            const [currentProStatus, currentSub] = await Promise.all([
                checkIsPro(user.uid),
                getSubscription(user.uid),
            ]);
            if (currentProStatus && currentSub?.status === 'active') {
                setIsPro(true);
                setSubscriptionStatus('active');
                toast.info(t('alreadyPro'));
                setTimeout(() => navigate("/"), 500);
                return;
            }

            const customerId = user.uid;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const redirectUrl = `${window.location.origin}/payment-success`;

            const response = await window.PortOne.requestIssueBillingKey({
                storeId: import.meta.env.VITE_PORTONE_STORE_ID,
                channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
                issueId: crypto.randomUUID(),
                billingKeyMethod: "CARD",
                issueName: t('paymentNamePro'),
                offerPeriod: {
                    interval: "1m",
                },
                redirectUrl: isMobile ? redirectUrl : undefined,
                customer: {
                    id: customerId,
                    fullName: user?.displayName || "User",
                    email: user.email || undefined,
                    phoneNumber: import.meta.env.VITE_TEST_PHONE_NUMBER || "01000000000",
                },
            });

            if (isMobile) return;

            if (response.code !== undefined) {
                toast.error(t('paymentPrepError').replace('{message}', response.message));
                return;
            }

            const { billingKey } = response;
            const API_BASE_URL = import.meta.env.VITE_API_URL || '';
            const subscribeResponse = await fetch(`${API_BASE_URL}/.netlify/functions/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.uid,
                    billingKey: billingKey,
                    userName: user.displayName || t('anonymousUser'),
                    userEmail: user.email || "",
                    userPhone: "010-0000-0000",
                }),
            });

            const result = await subscribeResponse.json();

            if (subscribeResponse.ok) {
                toast.success(t('subscriptionStarted'));
                setIsPro(true);
                setTimeout(() => navigate("/"), 2000);
            } else {
                toast.error(t('subscriptionError').replace('{message}', result.message));
            }
        } catch (error) {
            console.error("Payment issuance failed:", error);
            toast.error(t('unexpectedPaymentError'));
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
                        {t('pricingHero')}
                    </h1>
                </div>

                {/* Pricing Cards Container */}
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-6 mb-16">

                    {/* Starter Plan — hidden if already Pro */}
                    {!isPro && (
                        <div className="flex-1 max-w-[300px] p-8 rounded-[2rem] bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mb-4">{t('freePlanTitle')}</div>
                            <div className="mb-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white">₩0</span>
                                    <span className="text-slate-500 text-sm font-medium">/월</span>
                                </div>
                                <p className="text-slate-500 text-sm mt-1">{t('freePlanDesc')}</p>
                            </div>
                            <ul className="space-y-3 my-6 flex-1">
                                {[t('freePlanLimit'), t('socraticQuestions'), t('permanentStorage'), t('searchPastChats')].map((item, i) => (
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
                                {t('startFree')}
                            </button>
                        </div>
                    )}

                    {/* Pro Plan */}
                    <div className={`flex-1 max-w-[300px] p-8 rounded-[2rem] bg-white dark:bg-slate-900 border-2 border-primary flex flex-col relative shadow-[0_24px_48px_-8px_rgba(66,133,244,0.18)]`}>
                        {isPro && subscriptionStatus === 'active' ? (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg shadow-primary/40">
                                {t('currentlyUsing')}
                            </div>
                        ) : (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 text-xs font-bold rounded-full">
                                {t('recommended')}
                            </div>
                        )}
                        <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 self-start">Pro</div>
                        <div className="mb-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-900 dark:text-white">₩7,500</span>
                                <span className="text-slate-500 text-sm font-medium">/월</span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1">{t('proPlanDesc')}</p>
                        </div>
                        <ul className="space-y-3 my-6 flex-1">
                            {[t('sufficientUsage'), t('socraticQuestions'), t('permanentStorage'), t('searchPastChats')].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-800 dark:text-slate-200 text-sm font-semibold">
                                    <span className="material-icons text-primary text-base">check_circle</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={handleProPlan}
                            disabled={isPro && subscriptionStatus === 'active'}
                            className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {isPro && subscriptionStatus === 'active' ? t('subscribed') : t('startPro')}
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="flex-1 max-w-[300px] p-8 rounded-[2rem] bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                        <div className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mb-4">{t('enterprisePlanTitle')}</div>
                        <div className="mb-2">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">₩7,500</span>
                                <span className="text-slate-500 text-sm font-medium">{t('perPersonMonth')}</span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1">{t('enterprisePlanDesc')}</p>
                        </div>
                        <ul className="space-y-3 my-6 flex-1">
                            {[t('moreUsageThanPro'), t('allProFeatures'), t('adminDashboard'), t('orgMemberManagement'), t('dataExport'), t('dedicatedSupport')].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-500 text-sm">
                                    <span className="material-icons text-primary text-base">check_circle</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => window.open('https://socratestutor.channel.io', '_blank')}
                            className="w-full py-3 rounded-xl bg-white dark:bg-transparent border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                            {t('inquireNow')}
                        </button>
                    </div>
                </div>

                {/* VAT Notice */}
                <div className="max-w-2xl mx-auto text-center border-t border-slate-200 dark:border-slate-800 pt-8">
                    <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                        {t('vatIncluded')}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Pricing;
