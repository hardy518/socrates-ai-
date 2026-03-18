import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Insight } from "@/types/chat";

export interface UserSettings {
    conversationCount?: number;
    totalMessageCount?: number;
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
                ...data,
                insightNotification: data.insightNotification !== undefined ? data.insightNotification : true
            } as UserSettings;
        }
        return { insightNotification: true };
    } catch (error) {
        console.error("Error getting user settings:", error);
        return {};
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
