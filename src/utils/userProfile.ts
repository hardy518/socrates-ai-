import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ChatMode, Insight } from "@/types/chat";

export interface UserSettings {
    chatMode: ChatMode;
    socratesLevel: number;
    conversationCount?: number;
    insightBadge?: boolean;
    insight?: Insight;
    insightNotification?: boolean;
}

export const getUserSettings = async (userId: string): Promise<UserSettings> => {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                chatMode: (data.chatMode as ChatMode) || "socrates",
                socratesLevel: data.socratesLevel || 3,
                insightNotification: data.insightNotification !== undefined ? data.insightNotification : true
            };
        }
        return { chatMode: "socrates", socratesLevel: 3, insightNotification: true };
    } catch (error) {
        console.error("Error getting user settings:", error);
        return { chatMode: "socrates", socratesLevel: 3 };
    }
};

export const setUserSettings = async (userId: string, settings: Partial<UserSettings>) => {
    try {
        await setDoc(
            doc(db, "users", userId),
            {
                ...settings,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (error) {
        console.error("Error setting user settings:", error);
        throw error;
    }
};
