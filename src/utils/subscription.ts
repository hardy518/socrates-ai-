import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    Timestamp
} from "firebase/firestore";

export interface Subscription {
    plan: 'pro';
    status: 'active';
    startDate: Timestamp;
    endDate: Timestamp;
    orderId?: string;
    stripeSubscriptionId?: string;
    billingKey?: string;
    nextScheduledAt?: Timestamp;
}

/**
 * 구독 정보 가져오기 (없으면 null = 무료 사용자)
 */
export const getSubscription = async (userId: string): Promise<Subscription | null> => {
    try {
        const subDoc = await getDoc(doc(db, "users", userId, "subscription", "current"));
        if (subDoc.exists()) {
            return subDoc.data() as Subscription;
        }
        return null;
    } catch (error) {
        console.error("Error getting subscription:", error);
        return null;
    }
};

/**
 * Pro 플랜 설정
 */
export const setProPlan = async (userId: string, paymentData: {
    orderId?: string,
    stripeSubscriptionId?: string,
    billingKey?: string,
    nextScheduledAt?: Timestamp
}) => {
    try {
        const startDate = Timestamp.now();
        const endDate = new Timestamp(startDate.seconds + 30 * 24 * 60 * 60, 0); // 기본 30일

        const subData: Subscription = {
            plan: 'pro',
            status: 'active',
            startDate: startDate,
            endDate: endDate,
            orderId: paymentData.orderId,
            stripeSubscriptionId: paymentData.stripeSubscriptionId,
            billingKey: paymentData.billingKey,
            nextScheduledAt: paymentData.nextScheduledAt,
        };

        await setDoc(doc(db, "users", userId, "subscription", "current"), subData);

        // Usage limit 업데이트 (Pro는 사실상 무제한이지만 숫자로 관리한다면 999)
        await setDoc(doc(db, "users", userId, "usage", "current"), {
            limit: 999
        }, { merge: true });

    } catch (error) {
        console.error("Error setting pro plan:", error);
        throw error;
    }
};

/**
 * Pro 플랜 여부 확인 (boolean)
 */
export const checkIsPro = async (userId: string): Promise<boolean> => {
    const sub = await getSubscription(userId);
    return sub !== null && sub.plan === 'pro' && sub.status === 'active';
};

/**
 * 구독 삭제 (Pro → 무료 전환 시)
 */
export const deleteSubscription = async (userId: string) => {
    try {
        await deleteDoc(doc(db, "users", userId, "subscription", "current"));

        // Usage limit 원복 (무료 2)
        await setDoc(doc(db, "users", userId, "usage", "current"), {
            limit: 2
        }, { merge: true });

    } catch (error) {
        console.error("Error deleting subscription:", error);
        throw error;
    }
};
