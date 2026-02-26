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
    // PortOne uses POST for webhooks
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { paymentId, status, billingKey } = JSON.parse(event.body || "{}");
    const apiSecret = process.env.PORTONE_V2_API_SECRET;

    if (status !== "PAID") {
        return { statusCode: 200, body: "OK" }; // Ignore non-paid events for now
    }

    try {
        // 1. Find user by billingKey or paymentId (assuming paymentId contains userId as per our pattern)
        // Pattern: `schedule_${userId}_${timestamp}`
        const userIdMatch = paymentId.match(/schedule_(.+?)_\d+/);
        if (!userIdMatch) {
            console.error("Could not extract userId from paymentId:", paymentId);
            return { statusCode: 400, body: "Invalid paymentId format" };
        }
        const userId = userIdMatch[1];

        // 2. Update subscription in Firestore
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextScheduledAt = admin.firestore.Timestamp.fromDate(nextMonth);

        await db.collection("users").doc(userId).collection("subscription").doc("current").update({
            endDate: nextScheduledAt,
            lastPaymentId: paymentId,
            nextScheduledAt: nextScheduledAt,
        });

        // 3. Schedule next payment
        const nextScheduleId = `schedule_${userId}_${nextMonth.getTime()}`;
        await fetch("https://api.portone.io/payments-schedule", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `PortOne ${apiSecret}`,
            },
            body: JSON.stringify({
                schedules: [{
                    paymentId: nextScheduleId,
                    billingKey: billingKey,
                    orderName: "소크라테스 AI Pro 정기구독 (정기 결제)",
                    amount: { total: 7000, currency: "KRW" },
                    timeToPay: nextMonth.toISOString(),
                }],
            }),
        });

        return { statusCode: 200, body: "OK" };
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return { statusCode: 500, body: error.message };
    }
};
