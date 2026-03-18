import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
  getAdditionalUserInfo
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  reauthenticateWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize GoogleAuth for Capacitor
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: '230731687645-6v0uh2dpfdqb7khjtrg6urmh25k1fl6d.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }

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
      let firebaseUser: User;

      let isNewUser = false;

      if (Capacitor.isNativePlatform()) {
        console.log("📱 모바일 네이티브 로그인 시작...");
        const googleUser = await GoogleAuth.signIn();
        console.log("✅ GoogleAuth.signIn() 성공:", googleUser.email);

        if (!googleUser.authentication.idToken) {
          throw new Error("ID Token이 없습니다. Google 설정을 확인해주세요.");
        }

        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        console.log("🔗 Firebase Credential 생성 완료, 로그인 시도...");
        const result = await signInWithCredential(auth, credential);
        firebaseUser = result.user;
        isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
        console.log("🎉 Firebase 로그인 성공:", firebaseUser.email);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        firebaseUser = result.user;
        isNewUser = getAdditionalUserInfo(result)?.isNewUser ?? false;
      }

      if (isNewUser) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';
        fetch(`${API_BASE_URL}/.netlify/functions/notifyNewUser`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          }),
        }).catch(() => {});
      }

    } catch (error: any) {
      console.error("로그인 실패:", error);
      if (Capacitor.isNativePlatform()) {
        alert("로그인 에러 상세: " + JSON.stringify(error));
      }
      throw error;
    }
  };

  const reauthenticateWithGoogle = async () => {
    if (!auth.currentUser) return;
    
    try {
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        if (!googleUser.authentication.idToken) {
          throw new Error("ID Token이 없습니다.");
        }
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const { reauthenticateWithCredential } = await import("firebase/auth");
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        const { reauthenticateWithPopup } = await import("firebase/auth");
        await reauthenticateWithPopup(auth.currentUser, googleProvider);
      }
    } catch (error) {
      console.error("Re-authentication failed:", error);
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
      signInAnonymously: signInAnonymouslyManual,
      signOut,
      reauthenticateWithGoogle
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
