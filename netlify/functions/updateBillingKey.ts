import { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "")
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sendSlackMessage = async (text: string) => {
  const slackUrl = process.env.SLACK_PAYMENT_ALERT_WEBHOOK_URL;
  if (!slackUrl) return;
  try {
    await fetch(slackUrl, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }).catch(e => console.error("Slack alert failed:", e));
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  let contextUserId = "Unknown";
  try {
    const { userId, billingKey } = JSON.parse(event.body || "{}");
    contextUserId = userId || "Unknown";
    if (!userId || !billingKey) return { statusCode: 400, headers, body: "UserId and BillingKey are required" };

    const apiSecret = process.env.PORTONE_V2_API_SECRET;
    if (!apiSecret) throw new Error("API Secret is missing");

    // 1. Fetch billing key info to get card brand and last4
    const response = await fetch(`https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`, {
      headers: { "Authorization": `PortOne ${apiSecret}` }
    });

    let cardLast4 = "";
    let cardBrand = "";

    if (response.ok) {
      const result = await response.json();
      // PortOne V2: 카드 정보는 methods 배열의 첫 번째 항목
      const cardInfo = result.methods?.[0]?.card;
      cardLast4 = cardInfo?.number || "";
      cardBrand = cardInfo?.brand || "";
    }

    // 2. Get existing subscription to find scheduled payment
    const subRef = db.collection("users").doc(userId).collection("subscription").doc("current");
    const subDoc = await subRef.get();
    const subData = subDoc.data();
    const nextScheduledAt = subData?.nextScheduledAt;

    if (nextScheduledAt) {
      const nextScheduledDate = nextScheduledAt.toDate();
      // 기존 스케줄 ID: _r suffix가 있으면 그대로, 없으면 기본 형태
      const baseScheduleId = `schedule_${userId}_${nextScheduledDate.getTime()}`;
      const oldScheduleId = subData?.cardUpdateCount
        ? `${baseScheduleId}_r${subData.cardUpdateCount}`
        : baseScheduleId;

      // 3. Cancel old schedule in PortOne
      try {
        await fetch("https://api.portone.io/schedules-cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `PortOne ${apiSecret}`,
          },
          body: JSON.stringify({ scheduleIds: [oldScheduleId] }),
        });
        console.log(`Cancelled old schedule: ${oldScheduleId}`);
      } catch (err: any) {
        console.error("Failed to cancel old schedule:", err);
        await sendSlackMessage(`⚠️ 카드 변경 중 기존 스케줄 취소 실패: [${contextUserId}] | scheduleId: ${oldScheduleId} | 사유: ${err.message}`);
      }

      // 4. Re-create schedule with new billing key — _r{count} suffix로 ID 충돌 방지
      const newCount = (subData?.cardUpdateCount || 0) + 1;
      const newScheduleId = `${baseScheduleId}_r${newCount}`;
      try {
        const scheduleResponse = await fetch("https://api.portone.io/payments-schedule", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `PortOne ${apiSecret}`,
          },
          body: JSON.stringify({
            schedules: [{
              paymentId: newScheduleId,
              billingKey,
              orderName: "소크라테스 AI Pro 정기구독 (정기 결제)",
              currency: "KRW",
              amount: { total: 7500 },
              timeToPay: nextScheduledDate.toISOString(),
              customData: userId,
            }],
          }),
        });

        if (!scheduleResponse.ok) {
          const errorText = await scheduleResponse.text();
          throw new Error(`PortOne Schedule API Error: ${errorText}`);
        }

        console.log(`Re-created schedule with new billing key: ${newScheduleId}`);
      } catch (err: any) {
        console.error("Failed to re-create schedule:", err);
        await sendSlackMessage(`🚨 카드 변경 중 새 스케줄 등록 실패: [${contextUserId}] | scheduleId: ${newScheduleId} | 사유: ${err.message}`);
      }
    }

    // 5. Update Firestore with new billing key, card info, and updated cardUpdateCount
    // nextScheduledAt이 있을 때만 cardUpdateCount 저장 (스케줄 ID 추적 목적)
    const cardUpdateCount = (subData?.cardUpdateCount || 0) + (nextScheduledAt ? 1 : 0);
    await subRef.update({
      billingKey,
      cardLast4,
      cardBrand,
      ...(nextScheduledAt ? { cardUpdateCount } : {}),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Billing key updated", cardLast4, cardBrand }),
    };
  } catch (error: any) {
    console.error("Update billing key error:", error);
    await sendSlackMessage(`🚨 카드 변경 프로세스 치명적 오류: [${contextUserId}] | 사유: ${error.message}`);
    return { statusCode: 500, headers, body: JSON.stringify({ message: error.message }) };
  }
};
