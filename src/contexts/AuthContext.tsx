import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithPopup,
  signInAnonymously, // ← 추가!
  signOut as firebaseSignOut
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>; // ← 추가!
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 🔥 앱 로드 시 자동 익명 로그인
  useEffect(() => {
    const autoSignIn = async () => {
      if (!user && !loading) {
        try {
          await signInAnonymously(auth);
          console.log("✅ 익명 로그인 완료");
        } catch (error) {
          console.error("익명 로그인 실패:", error);
        }
      }
    };

    autoSignIn();
  }, [user, loading]);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // 🔥 신규 가입 알림 (슬랙)
      const { user: firebaseUser, _tokenResponse } = result as any;
      if (_tokenResponse?.isNewUser) {
        try {
          const slackUrl = import.meta.env.SLACK_PAYMENT_ALERT_WEBHOOK_URL;
          if (slackUrl) {
            const now = new Date().toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
            await fetch(slackUrl, {
              method: "POST",
              body: JSON.stringify({
                text: `🎉 신규 가입: [${firebaseUser.email}] | Google | ${now}`
              }),
            });
          }
        } catch (slackError) {
          console.error("슬랙 알림 보내기 실패:", slackError);
        }
      }
    } catch (error) {
      console.error("로그인 실패:", error);
      throw error;
    }
  };

  // 🔥 수동 익명 로그인 함수 (필요하면)
  const signInAnonymouslyManual = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("익명 로그인 실패:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("로그아웃 실패:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithGoogle,
      signInAnonymously: signInAnonymouslyManual, // ← 추가!
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
