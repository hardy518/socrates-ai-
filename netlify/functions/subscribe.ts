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

    // Version Marker: 2026-03-12-V3-ROOT
    console.log("DEBUG: ROOT subscribe.ts - Body:", event.body);
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
        // 0. Check for existing active subscription
        const subDoc = await db.collection("users").doc(userId).collection("subscription").doc("current").get();
        if (subDoc.exists) {
            const currentSub = subDoc.data();
            if (currentSub?.status === "active" && currentSub?.plan === "pro") {
                console.log(`User ${userId} already has an active Pro subscription. Blocking re-subscribe attempt.`);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ message: "이미 Pro 멤버십을 구독 중입니다. 중복 결제를 할 수 없습니다." })
                };
            }
        }

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
            console.error("Failed to parse pay response JSON:", payText);
        }
        if (!payResponse.ok) {
            console.error("Initial payment failed:", payResult);
            console.error("Status:", payResponse.status);
            console.error("Response text:", payText);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "첫 결제 실패", detail: payResult })
            };
        }

        // 2. Save billing key and subscription info to Firestore
        const now = admin.firestore.Timestamp.now();
        let nextMonth = new Date();
        
        // 2.1 Check if we should extend from an existing endDate (Resubscribe case)
        const existingSubDoc = await db.collection("users").doc(userId).collection("subscription").doc("current").get();
        if (existingSubDoc.exists) {
            const data = existingSubDoc.data();
            if (data?.status === "cancelled" && data?.endDate) {
                const existingEndDate = data.endDate.toDate();
                if (existingEndDate > now.toDate()) {
                    console.log(`Resubscribe detected for user ${userId}. Extending from ${existingEndDate.toISOString()}`);
                    nextMonth = new Date(existingEndDate);
                }
            }
        }
        
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

        // 3. Schedule next payment (V2 /payments-schedule)
        const scheduleId = `schedule_${userId}_${nextMonth.getTime()}`;
        const scheduleResponse = await fetch(`https://api.portone.io/payments-schedule`, {
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
                    currency: "KRW",
                    amount: { total: 7500 },
                    timeToPay: nextMonth.toISOString(),
                    customData: userId,
                }],
            }),
        });

        const scheduleText = await scheduleResponse.text();
        let scheduleResult = {};
        try {
            scheduleResult = (scheduleText && scheduleText.trim()) ? JSON.parse(scheduleText) : {};
        } catch (e) {
            console.error("Failed to parse schedule response JSON:", scheduleText);
        }
        if (!scheduleResponse.ok) {
            console.error("Scheduling failed:", scheduleResult);
            // Slack 알림 - 스케줄 실패는 다음 달 결제 누락으로 이어질 수 있음
            const slackUrl = process.env.SLACK_PAYMENT_ALERT_WEBHOOK_URL;
            if (slackUrl) {
                await fetch(slackUrl, {
                    method: 'POST',
                    body: JSON.stringify({ text: `⚠️ 스케줄 생성 실패: [${userEmail || userId}] | scheduleId: ${scheduleId} | ${new Date().toLocaleString('ko-KR')} | 다음 달 결제 누락 가능` }),
                }).catch(() => {});
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Subscription started", paymentId, scheduleId }),
        };
    } catch (error: any) {
        console.error("Subscribe function error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: error.message })
        };
    }
};
