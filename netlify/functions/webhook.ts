import { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
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
        await fetch(slackUrl, { method: 'POST', body: JSON.stringify({ text }) });
    } catch (error) {
        console.error("Slack notification failed:", error);
    }
};

/**
 * PortOne API로 결제 상세 정보를 조회합니다.
 * - 웹훅 payload는 paymentId만 제공하므로, 실제 데이터(customData, customer 등)는 여기서 가져옵니다.
 * - 동시에 "실제 결제가 성공했는가"를 검증하는 보안 역할도 합니다.
 */
const fetchPaymentDetails = async (paymentId: string, apiSecret: string): Promise<any | null> => {
    try {
        const res = await fetch(`https://api.portone.io/payments/${paymentId}`, {
            headers: { "Authorization": `PortOne ${apiSecret}` },
        });
        if (!res.ok) {
            console.error(`PortOne API error for payment ${paymentId}: ${res.status}`, await res.text());
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error(`Failed to fetch payment details for ${paymentId}:`, err);
        return null;
    }
};

/**
 * PortOne API로 빌링키 상세 정보를 조회합니다.
 * - BillingKey.Issued 웹훅에는 paymentId가 없으므로 별도 엔드포인트를 사용합니다.
 * - customData(userId)와 카드 정보를 여기서 가져옵니다.
 */
const fetchBillingKeyDetails = async (billingKey: string, apiSecret: string): Promise<any | null> => {
    try {
        const res = await fetch(`https://api.portone.io/billing-keys/${billingKey}`, {
            headers: { "Authorization": `PortOne ${apiSecret}` },
        });
        if (!res.ok) {
            console.error(`PortOne API error for billingKey ${billingKey}: ${res.status}`, await res.text());
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error(`Failed to fetch billing key details for ${billingKey}:`, err);
        return null;
    }
};

export const handler: Handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body || "{}");
        console.log("Webhook received:", JSON.stringify(payload, null, 2));

        const { type, data } = payload;

        // 테스트 웹훅은 즉시 200 응답 (BillingKey.Ready는 Issued와 다른 이벤트로 처리 불필요)
        if (type === "Webhook.Test" || type === "BillingKey.Ready") {
            console.log(`${type} received. Responding with 200.`);
            return { statusCode: 200, body: "OK" };
        }

        const apiSecret = process.env.PORTONE_V2_API_SECRET;
        if (!apiSecret) throw new Error("PORTONE_V2_API_SECRET is missing");

        const timestamp = admin.firestore.Timestamp;

        switch (type) {
            // ─────────────────────────────────────────────
            // 빌링키 발급 완료
            // ─────────────────────────────────────────────
            case "BillingKey.Issued": {
                const billingKey = data?.billingKey;
                if (!billingKey) {
                    console.error("BillingKey.Issued: billingKey가 웹훅에 없음");
                    return { statusCode: 200, body: "OK" };
                }

                // GET /billing-keys/{billingKey} 로 상세 조회
                const bkDetails = await fetchBillingKeyDetails(billingKey, apiSecret);
                if (!bkDetails) {
                    console.error(`빌링키 상세 조회 실패: ${billingKey}`);
                    return { statusCode: 200, body: "OK" };
                }

                // customData(userId) 추출
                const customerId: string = bkDetails.customData || bkDetails.customer?.id;
                if (!customerId) {
                    console.error(`BillingKey.Issued: userId 없음 | billingKey: ${billingKey}`);
                    return { statusCode: 200, body: "OK" };
                }

                // 카드 정보 추출 (methods 배열 첫 번째 항목)
                const cardMethod = bkDetails.methods?.[0]?.card;
                const cardLast4 = cardMethod?.number || "";
                const cardBrand = cardMethod?.brand || "";

                // Firestore에 billingKey와 카드 정보 저장
                // 실패해도 포트원에 200을 반환해야 재시도 루프를 막을 수 있음
                try {
                    const subRef = db.collection("users").doc(customerId).collection("subscription").doc("current");
                    await subRef.set({
                        billingKey,
                        cardLast4,
                        cardBrand,
                        updatedAt: timestamp.now()
                    }, { merge: true });
                    console.log(`BillingKey.Issued 처리 완료 | userId: ${customerId}`);
                } catch (fsErr) {
                    // subscribe / updateBillingKey가 뒤에 billingKey를 저장하므로 치명적이지 않음
                    console.error(`BillingKey.Issued Firestore 저장 실패 | userId: ${customerId}`, fsErr);
                }
                break;
            }

            // ─────────────────────────────────────────────
            // 결제 성공
            // ─────────────────────────────────────────────
            case "Transaction.Paid": {
                const paymentId = data?.paymentId;
                if (!paymentId) {
                    console.error("Transaction.Paid: paymentId가 웹훅에 없음");
                    return { statusCode: 200, body: "OK" };
                }

                // 1. PortOne API로 실제 결제 정보 조회 (검증 + 데이터 취득)
                const payment = await fetchPaymentDetails(paymentId, apiSecret);
                if (!payment) {
                    console.error(`결제 정보 조회 실패: ${paymentId}`);
                    return { statusCode: 200, body: "OK" };
                }

                // 2. 결제 상태 검증 — PAID가 아니면 처리하지 않음 (위조 방지)
                if (payment.status !== "PAID") {
                    console.error(`결제 ${paymentId} 상태가 ${payment.status}임. PAID가 아니라 처리 건너뜀.`);
                    return { statusCode: 200, body: "OK" };
                }

                // 3. customerId 추출 (customData 우선 → customer.id 순)
                const customerId: string = payment.customData || payment.customer?.id;
                if (!customerId) {
                    console.error(`결제 ${paymentId}: userId(customData) 없음`);
                    await sendSlackMessage(`⚠️ 결제 성공했으나 userId 없음 | paymentId: ${paymentId}`);
                    return { statusCode: 200, body: "OK" };
                }

                const userRef = db.collection("users").doc(customerId);
                const subRef = userRef.collection("subscription").doc("current");
                const usageRef = userRef.collection("usage").doc("current");

                // 4. 멱등성 체크 — 이미 처리된 결제는 스킵
                const paymentDoc = await userRef.collection("payments").doc(paymentId).get();
                if (paymentDoc.exists && paymentDoc.data()?.status === 'paid') {
                    console.log(`결제 ${paymentId} 이미 처리됨. 스킵.`);
                    return { statusCode: 200, body: "OK (Already Processed)" };
                }

                // 5. 날짜 계산
                const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date();
                const endDate = new Date(paidAt);
                endDate.setMonth(endDate.getMonth() + 1);

                // 6. 카드 정보 추출
                const cardInfo = payment.method?.card;
                const cardLast4 = cardInfo?.number || "";
                const cardBrand = cardInfo?.brand || "";

                // 7. Firestore - 구독 정보 업데이트
                const subDoc = await subRef.get();
                const isFirstPayment = !subDoc.exists || !subDoc.data()?.startDate;

                const updateData: any = {
                    plan: 'pro',
                    status: 'active',
                    endDate: timestamp.fromDate(endDate),
                    nextScheduledAt: timestamp.fromDate(endDate),
                    cardLast4,
                    cardBrand,
                    updatedAt: timestamp.now()
                };
                // billingKey가 응답에 있으면 업데이트 (없으면 기존 Firestore 값 유지)
                if (payment.billingKey) updateData.billingKey = payment.billingKey;
                if (isFirstPayment) updateData.startDate = timestamp.fromDate(paidAt);

                await subRef.set(updateData, { merge: true });

                // 8. Firestore - 사용량 업데이트
                await usageRef.set({
                    limit: 200,
                    count: 0,
                    resetAt: timestamp.fromDate(endDate),
                    updatedAt: timestamp.now()
                }, { merge: true });

                // 9. Firestore - 결제 이력 저장
                await userRef.collection("payments").doc(paymentId).set({
                    paymentId,
                    amount: payment.amount?.total || 7500,
                    status: "paid",
                    cardLast4,
                    cardBrand,
                    paidAt: timestamp.fromDate(paidAt),
                });

                // 10. 다음 달 자동 결제 예약
                const subSnap = await subRef.get();
                const billingKey = payment.billingKey || subSnap.data()?.billingKey;
                if (billingKey) {
                    const nextScheduleId = `schedule_${customerId}_${endDate.getTime()}`;
                    try {
                        await fetch("https://api.portone.io/payments-schedule", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `PortOne ${apiSecret}`,
                            },
                            body: JSON.stringify({
                                schedules: [{
                                    paymentId: nextScheduleId,
                                    billingKey,
                                    orderName: "소크라테스 AI Pro 정기구독 (정기 결제)",
                                    currency: "KRW",
                                    amount: { total: 7500 },
                                    timeToPay: endDate.toISOString(),
                                    customData: customerId,
                                }],
                            }),
                        });
                        console.log(`다음 달 결제 예약 완료: ${nextScheduleId}`);
                    } catch (err) {
                        console.error("다음 달 결제 예약 실패:", err);
                        await sendSlackMessage(`⚠️ 다음 달 결제 예약 실패 | userId: ${customerId} | scheduleId: ${nextScheduleId}`);
                    }
                } else {
                    console.error(`billingKey 없음 — 다음 달 예약 불가 | userId: ${customerId}`);
                    await sendSlackMessage(`⚠️ billingKey 없어 다음 달 예약 실패 | userId: ${customerId}`);
                }

                const userEmail = payment.customer?.email || customerId;
                const amount = payment.amount?.total || 0;
                await sendSlackMessage(`✅ 결제 성공: [${userEmail}] Pro | ₩${amount.toLocaleString()} | ${paidAt.toLocaleString('ko-KR')}`);
                break;
            }

            // ─────────────────────────────────────────────
            // 결제 실패 (단건 or 스케줄)
            // ─────────────────────────────────────────────
            case "Transaction.Failed":
            case "Schedule.Failed": {
                const paymentId = data?.paymentId;
                let customerId: string | null = null;
                let failureReason = "알 수 없는 이유";
                let userEmail = "Unknown";

                if (paymentId) {
                    // PortOne API로 실패 결제 상세 조회 → userId 추출
                    const payment = await fetchPaymentDetails(paymentId, apiSecret);
                    if (payment) {
                        customerId = payment.customData || payment.customer?.id || null;
                        // 포트원 V2 실패 사유 필드: failureReason.message
                        failureReason = payment.failureReason?.message || payment.statusText || "알 수 없는 이유";
                        userEmail = payment.customer?.email || "Unknown";
                    }
                }

                if (!customerId) {
                    console.error(`${type}: customerId 특정 불가 | paymentId: ${paymentId}`);
                    await sendSlackMessage(`⚠️ 결제 실패 (${type}): userId 특정 불가 | paymentId: ${paymentId || "없음"}`);
                    return { statusCode: 200, body: "OK" };
                }

                const userRef = db.collection("users").doc(customerId);
                const subRef = userRef.collection("subscription").doc("current");
                const usageRef = userRef.collection("usage").doc("current");

                await subRef.set({ status: 'inactive', updatedAt: timestamp.now() }, { merge: true });

                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                await usageRef.set({
                    limit: 5,
                    count: 0,
                    resetAt: timestamp.fromDate(tomorrow),
                    updatedAt: timestamp.now()
                }, { merge: true });

                await sendSlackMessage(`❌ 결제 실패 (${type}): [${userEmail}] | ${new Date().toLocaleString('ko-KR')} | 사유: ${failureReason}`);
                break;
            }

            // ─────────────────────────────────────────────
            // 구독/결제 취소 (cancelSubscription.ts가 선처리, 여기서 보완)
            // ─────────────────────────────────────────────
            case "Subscription.Cancelled":
            case "Transaction.Cancelled": {
                // 취소는 paymentId 검증 없이 처리 (결제가 발생하지 않음)
                const customerId: string = data?.customData || data?.customer?.id;
                if (!customerId) {
                    console.log(`${type}: customerId 없음, 스킵`);
                    return { statusCode: 200, body: "OK" };
                }

                const now = timestamp.now();
                const userRef = db.collection("users").doc(customerId);
                const subRef = userRef.collection("subscription").doc("current");

                await subRef.set({ status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true });
                await userRef.set({
                    subscription: { status: 'cancelled', cancelledAt: now },
                    updatedAt: now
                }, { merge: true });

                const cancelledEmail = data?.customer?.email || customerId;
                await sendSlackMessage(`🚫 구독 취소 확인 (PortOne webhook): [${cancelledEmail}] | ${new Date().toLocaleString('ko-KR')}`);
                break;
            }

            default:
                console.log(`처리하지 않는 이벤트 타입: ${type}`);
        }

        return { statusCode: 200, body: "OK" };
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return { statusCode: 500, headers, body: error.message };
    }
};
