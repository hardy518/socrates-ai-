import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
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
            problem: data.problem,
            attempts: data.attempts,
            goal: data.goal,
            depth: data.depth,
            currentStep: data.currentStep,
            messages: data.messages || [],
            isResolved: data.isResolved || false,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
          } as ChatSession;
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

  const createSession = useCallback(async (form: QuestionForm, depth: number): Promise<ChatSession> => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const newSession = {
      userId: user.uid,
      title: form.problem.slice(0, 30) + (form.problem.length > 30 ? '...' : ''),
      problem: form.problem,
      attempts: form.attempts,
      goal: form.goal,
      depth,
      currentStep: 0,
      messages: [],
      isResolved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'conversations'), newSession);
      
      const createdSession: ChatSession = {
        id: docRef.id,
        title: newSession.title,
        problem: newSession.problem,
        attempts: newSession.attempts,
        goal: newSession.goal,
        depth: newSession.depth,
        currentStep: 0,
        messages: [],
        isResolved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setActiveSessionId(docRef.id);
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
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        throw new Error('세션을 찾을 수 없습니다');
      }

      const newStep = message.role === 'user' ? session.currentStep + 1 : session.currentStep;
      const updatedMessages = [...session.messages, newMessage];

      await updateDoc(sessionRef, {
        messages: updatedMessages,
        currentStep: newStep,
        updatedAt: serverTimestamp(),
      });

      return newMessage;
    } catch (error) {
      console.error('메시지 추가 실패:', error);
      throw new Error('메시지 추가에 실패했습니다');
    }
  }, [user, sessions]);

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
    isLoading,
  };
}