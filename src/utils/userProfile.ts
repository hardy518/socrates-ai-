import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ChatMode } from "@/types/chat";

export const getUserChatMode = async (userId: string): Promise<ChatMode> => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return (data.chatMode as ChatMode) || "socrates";
        }
        return "socrates";
    } catch (error) {
        console.error("Error getting user chat mode:", error);
        return "socrates";
    }
};

export const setUserChatMode = async (userId: string, mode: ChatMode) => {
    try {
        await setDoc(
            doc(db, "users", userId),
            {
                chatMode: mode,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (error) {
        console.error("Error setting user chat mode:", error);
        throw error;
    }
};
