import { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            clientEmail: process.env.BASE_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
    });
}

const db = admin.firestore();

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const handler: Handler = async (event) => {
    // Handle Preflight OPTIONS request
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers,
            body: "",
        };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: "Method Not Allowed" };
    }

    // Version Marker: 2026-03-12-V2
    // Version Marker: 2026-03-12-V3-LANDING
    console.log("DEBUG: LANDING subscribe.ts - Body:", event.body);
    
    const body = event.body ? JSON.parse(event.body) : {};
    const { userId, billingKey, userName, userEmail, userPhone } = body;
    const apiSecret = process.env.PORTONE_V2_API_SECRET;
    const channelKey = process.env.VITE_PORTONE_CHANNEL_KEY;

    if (!apiSecret) {
        console.error("PORTONE_V2_API_SECRET is missing!");
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "PortOne API Secret is not configured" })
        };
    }

    console.log(`Processing subscription for user: ${userId}, billingKey: ${billingKey}`);

    try {
        // 1. Process initial payment (₩7,500)
        const paymentId = `initial_${userId}_${Date.now()}`;
        const payResponse = await fetch(`https://api.portone.io/payments/${paymentId}/billing-key`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `PortOne ${apiSecret}`,
            },
            body: JSON.stringify({
                billingKey,
                channelKey,
                orderName: "소크라테스 AI Pro 정기구독 (첫 결제)",
                currency: "KRW",
                amount: { total: 7500 },
                customer: {
                    id: userId,
                    name: {
                        full: userName || "사용자",
                    },
                    email: userEmail || `${userId}@socrates.ai`,
                    phoneNumber: "010-0000-0000",
                },
                customData: userId,
            }),
        });

        const payText = await payResponse.text();
        let payResult = {};
        try {
            payResult = (payText && payText.trim()) ? JSON.parse(payText) : {};
        } catch (e) {
            console.error("Failed to parse pay response JSON (Landing):", payText);
        }
        if (!payResponse.ok) {
            console.error("Initial payment failed (Landing):", payResult);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "첫 결제 실패", detail: payResult })
            };
        }

        // 2. Extract card info and save billing info to Firestore
        const cardInfo = (payResult as any)?.payment?.method?.card;
        const cardLast4 = cardInfo?.number || "";
        const cardBrand = cardInfo?.brand || "";

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
            cardLast4,
            cardBrand,
            updatedAt: now
        }, { merge: true });

        // 2-1. Save to payment history
        await db.collection("users").doc(userId).collection("payments").doc(paymentId).set({
            paymentId,
            amount: 7500,
            status: "paid",
            cardLast4,
            cardBrand,
            paidAt: now,
        });

        // 3. Schedule next payment
        const scheduleId = `schedule_${userId}_${nextMonth.getTime()}`;
        const scheduleResponse = await fetch(`https://api.portone.io/payments/${encodeURIComponent(scheduleId)}/schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `PortOne ${apiSecret}`,
            },
            body: JSON.stringify({
                payment: {
                    billingKey: billingKey,
                    orderName: "소크라테스 AI Pro 정기구독 (정기 결제)",
                    currency: "KRW",
                    amount: { total: 7500 },
                    customer: { id: userId },
                    customData: userId,
                },
                timeToPay: nextMonth.toISOString(),
            }),
        });

        const scheduleText = await scheduleResponse.text();
        console.log("Schedule status:", scheduleResponse.status);
        console.log("Schedule response:", scheduleText);
        let scheduleResult = {};
        try {
            scheduleResult = (scheduleText && scheduleText.trim()) ? JSON.parse(scheduleText) : {};
        } catch (e) {
            console.error("Failed to parse schedule response JSON (Landing):", scheduleText);
        }
        if (!scheduleResponse.ok) {
            console.error("Scheduling failed:", scheduleResult);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Subscription started", paymentId, scheduleId }),
        };
    } catch (error: any) {
        console.error("Subscribe function error (Landing):", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: error.message })
        };
    }
};
