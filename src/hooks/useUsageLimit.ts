import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_ANONYMOUS_DAILY_LIMIT = 3;
const DEFAULT_FREE_DAILY_LIMIT = 5;
const DEFAULT_FREE_WEEKLY_LIMIT = 20;
const DEFAULT_PRO_WEEKLY_LIMIT = 50;
const DEFAULT_PRO_MONTHLY_LIMIT = 200;

export const DEPTH_ANONYMOUS = 10;
export const DEPTH_FREE = 15;
export const DEPTH_PRO = 30;

export interface UsageData {
  count: number;
  limit: number;
  resetAt: Timestamp;
}

export function useUsageLimit() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [shortTermUsage, setShortTermUsage] = useState<UsageData | null>(null);
  const [longTermUsage, setLongTermUsage] = useState<UsageData | null>(null);
  const [canUse, setCanUse] = useState(true);
  const [isPro, setIsPro] = useState(false);

  const getNextDailyReset = () => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(next);
  };

  const getNextWeeklyReset = (startDate?: Timestamp) => {
    const now = new Date();
    if (!startDate) {
      const next = new Date();
      const day = next.getDay();
      const diff = (day === 0 ? 1 : 8 - day); // Mon = 1, Sun = 0. Next Mon.
      next.setDate(next.getDate() + diff);
      next.setHours(0, 0, 0, 0);
      return Timestamp.fromDate(next);
    }

    const start = startDate.toDate();
    let next = new Date(start);
    const weeksToAdd = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    next.setDate(start.getDate() + weeksToAdd * 7);
    return Timestamp.fromDate(next);
  };

  const getNextMonthlyReset = (startDate?: Timestamp) => {
    const now = new Date();
    if (!startDate) {
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      next.setHours(0, 0, 0, 0);
      return Timestamp.fromDate(next);
    }

    const start = startDate.toDate();
    let next = new Date(start);
    let monthsToAdd = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    next.setMonth(start.getMonth() + monthsToAdd);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
    return Timestamp.fromDate(next);
  };

  const checkUsage = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const usageRef = doc(db, 'users', user.uid, 'usage', 'current');
      const usageDoc = await getDoc(usageRef);
      
      const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
      const subDoc = await getDoc(subRef);
      const subData = subDoc.data();
      const isPro = subDoc.exists() && subData?.plan === 'pro' && (
        subData?.status === 'active' || 
        (subData?.status === 'cancelled' && subData?.endDate && subData.endDate.seconds > Timestamp.now().seconds)
      );
      setIsPro(isPro);
      const startDate = subData?.startDate;
      const isAnonymous = user.isAnonymous;

      let shortTerm: UsageData;
      let longTerm: UsageData;

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        
        // Migration or New Schema check
        if (!data.shortTerm || !data.longTerm) {
          // Initialize new schema based on plan
          shortTerm = {
            count: 0,
            limit: isPro ? DEFAULT_PRO_WEEKLY_LIMIT : (isAnonymous ? DEFAULT_ANONYMOUS_DAILY_LIMIT : DEFAULT_FREE_DAILY_LIMIT),
            resetAt: isPro ? getNextWeeklyReset(startDate) : getNextDailyReset()
          };
          longTerm = {
            count: data.count || 0, // Preserve old count if relevant
            limit: isPro ? DEFAULT_PRO_MONTHLY_LIMIT : (isAnonymous ? DEFAULT_FREE_DAILY_LIMIT : DEFAULT_FREE_WEEKLY_LIMIT), // Anonymous has no long term but uses free daily as placeholder
            resetAt: data.resetAt || (isPro ? getNextMonthlyReset(startDate) : getNextWeeklyReset())
          };
          
          await setDoc(usageRef, { shortTerm, longTerm }, { merge: true });
        } else {
          shortTerm = data.shortTerm;
          longTerm = data.longTerm;
        }

        // Check for resets
        const now = Timestamp.now();
        let needsUpdate = false;

        if (now.seconds > shortTerm.resetAt.seconds) {
          shortTerm.count = 0;
          shortTerm.resetAt = isPro ? getNextWeeklyReset(startDate) : getNextDailyReset();
          shortTerm.limit = isPro ? DEFAULT_PRO_WEEKLY_LIMIT : (isAnonymous ? DEFAULT_ANONYMOUS_DAILY_LIMIT : DEFAULT_FREE_DAILY_LIMIT);
          needsUpdate = true;
        }

        if (now.seconds > longTerm.resetAt.seconds) {
          longTerm.count = 0;
          longTerm.resetAt = isPro ? getNextMonthlyReset(startDate) : getNextWeeklyReset();
          longTerm.limit = isPro ? DEFAULT_PRO_MONTHLY_LIMIT : DEFAULT_FREE_WEEKLY_LIMIT;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await updateDoc(usageRef, { shortTerm, longTerm });
        }
      } else {
        // Create initial
        shortTerm = {
          count: 0,
          limit: isPro ? DEFAULT_PRO_WEEKLY_LIMIT : (isAnonymous ? DEFAULT_ANONYMOUS_DAILY_LIMIT : DEFAULT_FREE_DAILY_LIMIT),
          resetAt: isPro ? getNextWeeklyReset(startDate) : getNextDailyReset()
        };
        longTerm = {
          count: 0,
          limit: isPro ? DEFAULT_PRO_MONTHLY_LIMIT : (isAnonymous ? DEFAULT_FREE_DAILY_LIMIT : DEFAULT_FREE_WEEKLY_LIMIT),
          resetAt: isPro ? getNextMonthlyReset(startDate) : getNextWeeklyReset()
        };

        await setDoc(usageRef, { shortTerm, longTerm });
      }

      setShortTermUsage(shortTerm);
      setLongTermUsage(longTerm);
      setCanUse(shortTerm.count < shortTerm.limit && longTerm.count < longTerm.limit);
    } catch (error) {
      console.error('사용 횟수 확인 실패:', error);
      setCanUse(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndIncrementUsage = async (conversationId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const usageRef = doc(db, 'users', user.uid, 'usage', 'current');
      const usageDoc = await getDoc(usageRef);

      if (!usageDoc.exists()) {
        await checkUsage();
        return checkAndIncrementUsage(conversationId);
      }

      const data = usageDoc.data();
      const short = data.shortTerm;
      const long = data.longTerm;

      if (!short || !long || short.count >= short.limit || long.count >= long.limit) {
        return false;
      }

      await updateDoc(usageRef, {
        'shortTerm.count': increment(1),
        'longTerm.count': increment(1),
        lastUsedAt: Timestamp.now(),
        lastConversationId: conversationId
      });

      await checkUsage();
      return true;
    } catch (error) {
      console.error('사용량 증가 실패:', error);
      return false;
    }
  };

  useEffect(() => {
    checkUsage();
  }, [user]);

  return {
    isLoading,
    shortTermUsage,
    longTermUsage,
    canUse,
    isPro,
    checkAndIncrementUsage,
    checkUsage
  };
}
