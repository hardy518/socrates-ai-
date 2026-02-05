import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDC0S8LPguHhWUOM3X4ljPuRlBrd2xzGzk",
  authDomain: "socrates-ai-976fb.firebaseapp.com",
  projectId: "socrates-ai-976fb",
  storageBucket: "socrates-ai-976fb.firebasestorage.app",
  messagingSenderId: "230731687645",
  appId: "1:230731687645:web:d425a6b0ae094c7c479d34",
  measurementId: "G-7SPXT5TD0Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore
export const db = getFirestore(app);