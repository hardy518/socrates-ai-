import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_FREE_LIMIT = 5;

export function useUsageLimit() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [remainingCount, setRemainingCount] = useState(0);
  const [canUse, setCanUse] = useState(true);

  const checkUsage = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const usageRef = doc(db, 'users', user.uid, 'usage', 'current');
      const usageDoc = await getDoc(usageRef);

      let limit = DEFAULT_FREE_LIMIT;
      let count = 0;
      let resetAt: Timestamp | null = null;

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        limit = data.limit ?? DEFAULT_FREE_LIMIT;
        count = data.count ?? 0;
        resetAt = data.resetAt;

        // Check for reset
        if (resetAt && Timestamp.now().seconds > resetAt.seconds) {
          // Reset count
          count = 0;
          let nextReset: Date;

          // Determine next reset based on plan
          const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
          const subDoc = await getDoc(subRef);
          const isPro = subDoc.exists() && subDoc.data().plan === 'pro' && subDoc.data().status === 'active';

          if (isPro) {
            // Pro reset is usually handled by webhook on payment, 
            // but we can fallback to monthly if needed. 
            // For now, let's keep the existing resetAt from the webhook if available.
            nextReset = resetAt.toDate();
            nextReset.setMonth(nextReset.getMonth() + 1);
          } else {
            // Free reset: Tomorrow midnight
            nextReset = new Date();
            nextReset.setDate(nextReset.getDate() + 1);
            nextReset.setHours(0, 0, 0, 0);
          }

          await updateDoc(usageRef, {
            count: 0,
            resetAt: Timestamp.fromDate(nextReset)
          });
        }
      } else {
        // Create initial free usage doc
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        await setDoc(usageRef, {
          limit: DEFAULT_FREE_LIMIT,
          count: 0,
          resetAt: Timestamp.fromDate(tomorrow)
        });
      }

      setRemainingCount(Math.max(0, limit - count));
      setCanUse(count < limit);
    } catch (error) {
      console.error('사용 횟수 확인 실패:', error);
      setCanUse(false);
      setRemainingCount(0);
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
        await checkUsage(); // Initialize if not exists
        return checkAndIncrementUsage(conversationId);
      }

      const data = usageDoc.data();
      if (data.count >= data.limit) {
        return false;
      }

      await updateDoc(usageRef, {
        count: increment(1),
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
    remainingCount,
    canUse,
    checkAndIncrementUsage,
    checkUsage
  };
}
