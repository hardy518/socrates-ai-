import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const DAILY_LIMIT = 2;

export function useUsageLimit() {
  const { user } = useAuth(); // ← currentUser에서 user로 변경
  const [isLoading, setIsLoading] = useState(true);
  const [remainingCount, setRemainingCount] = useState(DAILY_LIMIT);
  const [canUse, setCanUse] = useState(true);

  const getTodayKey = (userId: string): string => {
    const today = new Date().toISOString().split('T')[0];
    return `${userId}_${today}`;
  };

  const checkUsage = async () => {
    if (!user) { // ← 여기도 수정
      setIsLoading(false);
      return;
    }

    try {
      const usageKey = getTodayKey(user.uid); // ← 여기도 수정
      const usageRef = doc(db, 'usage', usageKey);
      const usageDoc = await getDoc(usageRef);

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        const used = data.count || 0;
        const remaining = Math.max(0, DAILY_LIMIT - used);
        
        setRemainingCount(remaining);
        setCanUse(remaining > 0);
      } else {
        setRemainingCount(DAILY_LIMIT);
        setCanUse(true);
      }
    } catch (error) {
      console.error('사용 횟수 확인 실패:', error);
      setCanUse(true);
      setRemainingCount(DAILY_LIMIT);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndIncrementUsage = async (conversationId: string): Promise<boolean> => {
    if (!user) return false; // ← 여기도 수정

    try {
      const usageKey = getTodayKey(user.uid); // ← 여기도 수정
      const usageRef = doc(db, 'usage', usageKey);
      const usageDoc = await getDoc(usageRef);

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        
        if (data.count >= DAILY_LIMIT) {
          return false;
        }

        await updateDoc(usageRef, {
          count: increment(1),
          lastUsedAt: Date.now(),
          conversations: [...(data.conversations || []), conversationId]
        });
      } else {
        await setDoc(usageRef, {
          userId: user.uid, // ← 여기도 수정
          date: new Date().toISOString().split('T')[0],
          count: 1,
          lastUsedAt: Date.now(),
          conversations: [conversationId]
        });
      }

      await checkUsage();
      return true;
    } catch (error) {
      console.error('사용량 증가 실패:', error);
      return false;
    }
  };

  useEffect(() => {
    checkUsage();
  }, [user]); // ← 여기도 수정

  return {
    isLoading,
    remainingCount,
    canUse,
    checkAndIncrementUsage,
    checkUsage
  };
}