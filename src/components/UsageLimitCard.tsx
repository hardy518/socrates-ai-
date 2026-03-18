import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUsageLimit } from "@/hooks/useUsageLimit";

export function UsageLimitCard() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const { shortTermUsage, longTermUsage, isPro } = useUsageLimit();

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const getResetTimeText = () => {
    if (!isPro || !shortTermUsage || !longTermUsage) return "";
    
    const shortLimitReached = shortTermUsage.count >= shortTermUsage.limit;
    const longLimitReached = longTermUsage.count >= longTermUsage.limit;
    
    let resetDate: Date;
    if (shortLimitReached && longLimitReached) {
      resetDate = shortTermUsage.resetAt.seconds > longTermUsage.resetAt.seconds 
        ? shortTermUsage.resetAt.toDate() 
        : longTermUsage.resetAt.toDate();
    } else if (shortLimitReached) {
      resetDate = shortTermUsage.resetAt.toDate();
    } else {
      resetDate = longTermUsage.resetAt.toDate();
    }

    return resetDate.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
  };

  const isAnonymous = user?.isAnonymous;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center gap-2">
        <div className="text-center space-y-1">
          <h3 className="font-bold text-base text-foreground">
            {t('usageLimitReached')}
          </h3>
          <p className="text-sm font-medium text-orange-500 leading-relaxed">
            {isPro
              ? t('proLimitReached').replace('{resetTime}', getResetTimeText())
              : isAnonymous
                ? t('anonymousLimitReached')
                : t('freeLimitReached')
            }
          </p>
        </div>

        <div className="flex gap-2 w-full max-w-sm mt-1">
          {isAnonymous ? (
            <Button
              onClick={handleLogin}
              className="w-full h-11 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-md active:scale-[0.98] transition-all"
            >
              {t('loginToContinue')}
            </Button>
          ) : !isPro ? (
            <Button
              onClick={handleUpgrade}
              className="w-full h-11 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold shadow-md active:scale-[0.98] transition-all"
            >
              {t('upgradeToProAction')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
