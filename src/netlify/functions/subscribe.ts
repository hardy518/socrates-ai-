import { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
    });
}

const db = admin.firestore();

export const handler: Handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { userId, billingKey } = JSON.parse(event.body || "{}");
    const apiSecret = process.env.PORTONE_V2_API_SECRET;

    if (!apiSecret) {
        return { statusCode: 500, body: JSON.stringify({ message: "PortOne API Secret is not configured" }) };
    }

    try {
        // 1. Process initial payment (₩7,000)
        const paymentId = `initial_${userId}_${Date.now()}`;
        const payResponse = await fetch(`https://api.portone.io/billing-keys/${billingKey}/pay`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `PortOne ${apiSecret}`,
            },
            body: JSON.stringify({
                paymentId,
                orderName: "소크라테스 AI Pro 정기구독 (첫 결제)",
                amount: { total: 7000, currency: "KRW" },
            }),
        });

        const payResult = await payResponse.json();
        if (!payResponse.ok) {
            console.error("Initial payment failed:", payResult);
            return { statusCode: 400, body: JSON.stringify({ message: "첫 결제 실패", detail: payResult }) };
        }

        // 2. Save billing key and subscription info to Firestore
        const now = admin.firestore.Timestamp.now();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextScheduledAt = admin.firestore.Timestamp.fromDate(nextMonth);

        await db.collection("users").doc(userId).collection("subscription").doc("current").set({
            plan: "pro",
            status: "active",
            startDate: now,
            endDate: nextScheduledAt,
            billingKey: billingKey,
            lastPaymentId: paymentId,
            nextScheduledAt: nextScheduledAt,
        });

        // 3. Schedule next payment
        const scheduleId = `schedule_${userId}_${nextMonth.getTime()}`;
        const scheduleResponse = await fetch("https://api.portone.io/payments-schedule", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `PortOne ${apiSecret}`,
            },
            body: JSON.stringify({
                schedules: [{
                    paymentId: scheduleId,
                    billingKey: billingKey,
                    orderName: "소크라테스 AI Pro 정기구독 (정기 결제)",
                    amount: { total: 7000, currency: "KRW" },
                    timeToPay: nextMonth.toISOString(),
                }],
            }),
        });

        const scheduleResult = await scheduleResponse.json();
        if (!scheduleResponse.ok) {
            console.error("Scheduling failed:", scheduleResult);
            // Note: Even if scheduling fails, the initial payment was successful. 
            // We might want to mark the subscription but warning about scheduling.
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Subscription started", paymentId, scheduleId }),
        };
    } catch (error: any) {
        console.error("Subscribe function error:", error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
