import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ChatSession, Message, QuestionForm, MessageFile } from '@/types/chat';

export function useChatStorage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore에서 세션 목록 실시간 구독
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            category: data.category || "problem-solving",
            problem: data.problem,

            depth: data.depth,
            currentStep: data.currentStep,
            messages: data.messages || [],
            isResolved: data.isResolved || false,
            isPinned: data.isPinned || false,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
          } as ChatSession;
        }).sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });

        setSessions(sessionsData);
        setIsLoading(false);
      },
      (error) => {
        console.error('세션 로딩 실패:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createSession = useCallback(async (form: QuestionForm, depth: number, initialTitle?: string): Promise<ChatSession> => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const newSession = {
      userId: user.uid,
      title: form.problem 
        ? (form.problem.slice(0, 30) + (form.problem.length > 30 ? '...' : ''))
        : (initialTitle || ""),
      category: form.category,
      problem: form.problem,

      depth,
      currentStep: 0,
      messages: [],
      isResolved: false,
      isSummarized: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'conversations'), newSession);

      // 🔥 대화 횟수 증가 및 인사이트 분석 트리거
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const currentCount = (userDoc.data()?.conversationCount || 0) + 1;

      await setDoc(userRef, {
        conversationCount: increment(1),
        updatedAt: serverTimestamp()
      }, { merge: true });

      const createdSession: ChatSession = {
        id: docRef.id,
        title: newSession.title,
        category: newSession.category as any,
        problem: newSession.problem,

        depth: newSession.depth,
        currentStep: 0,
        messages: [],
        isResolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return createdSession;
    } catch (error) {
      console.error('세션 생성 실패:', error);
      throw new Error('세션 생성에 실패했습니다');
    }
  }, [user]);

  const addMessage = useCallback(async (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    try {
      const sessionRef = doc(db, 'conversations', sessionId);

      // 🔥 수정: Firestore에서 직접 가져오기
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        throw new Error('세션을 찾을 수 없습니다');
      }

      const sessionData = sessionDoc.data();
      const currentMessages = sessionData.messages || [];
      const currentStep = sessionData.currentStep || 0;

      const newStep = message.role === 'user' ? currentStep + 1 : currentStep;
      const updatedMessages = [...currentMessages, newMessage];

      await updateDoc(sessionRef, {
        messages: updatedMessages,
        currentStep: newStep,
        updatedAt: serverTimestamp(),
      });

      // 🔥 사용자 메시지일 경우 누적 메시지 수 증가 및 인사이트 분석 트리거
      if (message.role === 'user') {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const currentTotalMessages = (userDoc.data()?.totalMessageCount || 0) + 1;

        await setDoc(userRef, {
          totalMessageCount: increment(1),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 20회마다 인사이트 분석 실행
        if (currentTotalMessages % 20 === 0) {
          import('@/lib/claude').then(({ analyzeInsight }) => {
            analyzeInsight(user.uid, currentTotalMessages).catch(console.error);
          });
        }
      }

      return newMessage;
    } catch (error) {
      console.error('메시지 추가 실패:', error);
      throw new Error('메시지 추가에 실패했습니다');
    }
  }, [user]);

  const resolveSession = useCallback(async (sessionId: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      await updateDoc(sessionRef, {
        isResolved: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('세션 완료 처리 실패:', error);
      throw new Error('세션 완료 처리에 실패했습니다');
    }
  }, [user]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      await deleteDoc(sessionRef);

      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error) {
      console.error('세션 삭제 실패:', error);
      throw new Error('세션 삭제에 실패했습니다');
    }
  }, [user, activeSessionId]);

  const clearActiveSession = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  const updateSessionTitle = useCallback(async (sessionId: string, newTitle: string) => {
    if (!user) return;
    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      await updateDoc(sessionRef, {
        title: newTitle,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('세션 제목 업데이트 실패:', error);
    }
  }, [user]);

  const updateSessionProblem = useCallback(async (sessionId: string, newProblem: string) => {
    if (!user) return;
    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      await updateDoc(sessionRef, {
        problem: newProblem,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('세션 문제 업데이트 실패:', error);
    }
  }, [user]);
  
  const updateMessage = useCallback(async (sessionId: string, messageId: string, updates: Partial<Message>) => {
    if (!user) return;
    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      if (!sessionDoc.exists()) return;

      const messages = sessionDoc.data().messages as Message[];
      const updatedMessages = messages.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      );

      await updateDoc(sessionRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('메시지 업데이트 실패:', error);
    }
  }, [user]);

  const forkSession = useCallback(async (sessionId: string, messageId: string, newContent: string) => {
    if (!user) return;
    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      if (!sessionDoc.exists()) return;

      const messages = sessionDoc.data().messages as Message[];
      const messageIndex = messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) return;

      // 해당 메시지까지 자르고, 해당 메시지 내용 수정
      const truncatedMessages = messages.slice(0, messageIndex + 1);
      truncatedMessages[messageIndex] = {
        ...truncatedMessages[messageIndex],
        content: newContent,
        timestamp: Date.now()
      };

      await updateDoc(sessionRef, {
        messages: truncatedMessages,
        currentStep: truncatedMessages.filter(m => m.role === 'user').length,
        isResolved: false,
        updatedAt: serverTimestamp(),
      });
      
      return truncatedMessages;
    } catch (error) {
      console.error('세션 포크 실패:', error);
    }
  }, [user]);

  const togglePinSession = useCallback(async (sessionId: string, isPinned: boolean) => {
    if (!user) return;
    try {
      const sessionRef = doc(db, 'conversations', sessionId);
      await updateDoc(sessionRef, {
        isPinned: isPinned,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('세션 고정 업데이트 실패:', error);
    }
  }, [user]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    addMessage,
    resolveSession,
    deleteSession,
    clearActiveSession,
    updateSessionTitle,
    togglePinSession,
    updateMessage,
    forkSession,
    updateSessionProblem,
    isLoading,
  };
}
