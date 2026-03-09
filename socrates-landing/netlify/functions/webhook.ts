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

const sendSlackMessage = async (text: string) => {
    const slackUrl = process.env.SLACK_PAYMENT_ALERT_WEBHOOK_URL;
    if (!slackUrl) return;

    try {
        await fetch(slackUrl, {
            method: 'POST',
            body: JSON.stringify({ text }),
        });
    } catch (error) {
        console.error("Slack notification failed:", error);
    }
};

export const handler: Handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const payload = JSON.parse(event.body || "{}");
        console.log("Webhook Payload Received:", JSON.stringify(payload, null, 2));

        const { type, data } = payload;

        // PortOne V2 extraction logic
        // Skip processing for test webhooks and BillingKey.Ready
        if (type === "Webhook.Test" || type === "BillingKey.Ready") {
            console.log(`${type} received. Responding with 200.`);
            return { statusCode: 200, body: "OK" };
        }

        // customerId can be in data.customer.id or data.payment.customer.id
        const customerId = data?.customer?.id || data?.payment?.customer?.id;
        
        if (!customerId) {
            console.error(`No customer ID found for event ${type}. Paths checked: data.customer.id, data.payment.customer.id`);
            return { 
                statusCode: 400, 
                body: JSON.stringify({ 
                    error: "Bad Request: No customer ID", 
                    receivedType: type,
                    hint: "Ensure customer.id is passed in the payment request or billing key issue request"
                }) 
            };
        }

        const userRef = db.collection("users").doc(customerId);
        const subRef = userRef.collection("subscription").doc("current");
        const usageRef = userRef.collection("usage").doc("current");

        const paidAt = data?.paidAt ? new Date(data.paidAt) : new Date();
        const endDate = new Date(paidAt);
        endDate.setMonth(endDate.getMonth() + 1);

        const timestamp = admin.firestore.Timestamp;

        switch (type) {
            case "Transaction.Paid": {
                const subDoc = await subRef.get();
                const isFirstPayment = !subDoc.exists || !subDoc.data()?.startDate;

                const updateData: any = {
                    plan: 'pro',
                    status: 'active',
                    endDate: timestamp.fromDate(endDate),
                    billingKey: data?.billingKey || admin.firestore.FieldValue.delete(),
                    nextScheduledAt: timestamp.fromDate(endDate),
                    updatedAt: timestamp.now()
                };

                if (isFirstPayment) {
                    updateData.startDate = timestamp.fromDate(paidAt);
                }

                await subRef.set(updateData, { merge: true });

                // Update Usage
                await usageRef.set({
                    limit: 200,
                    count: 0,
                    resetAt: timestamp.fromDate(endDate),
                    updatedAt: timestamp.now()
                }, { merge: true });

                // 3. Schedule NEXT payment (Recurring)
                const apiSecret = process.env.PORTONE_V2_API_SECRET;
                const billingKey = data?.billingKey || (await subDoc.data()?.billingKey);

                if (billingKey && apiSecret) {
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
                                    billingKey: billingKey,
                                    orderName: "소크라테스 AI Pro 정기구독 (정기 결제)",
                                    amount: { total: 7000, currency: "KRW" },
                                    timeToPay: endDate.toISOString(),
                                }],
                            }),
                        });
                        console.log(`Scheduled next payment: ${nextScheduleId}`);
                    } catch (err) {
                        console.error("Failed to schedule next payment:", err);
                    }
                }

                const userEmail = data?.customer?.email || "Unknown";
                const amount = data?.amount?.total || 0;
                await sendSlackMessage(`✅ 결제 성공: [${userEmail}] Pro 결제 완료 | ₩${amount.toLocaleString()} | ${paidAt.toLocaleString('ko-KR')}`);
                break;
            }

            case "Transaction.Failed": {
                await subRef.set({
                    status: 'inactive',
                    updatedAt: timestamp.now()
                }, { merge: true });

                const userEmail = data?.customer?.email || "Unknown";
                const failureReason = data?.statusText || "알 수 없는 이유";
                await sendSlackMessage(`❌ 결제 실패: [${userEmail}] 결제 실패 | ${new Date().toLocaleString('ko-KR')} | 사유: ${failureReason}`);
                break;
            }

            case "Subscription.Cancelled": {
                await subRef.set({
                    status: 'cancelled',
                    plan: 'free',
                    updatedAt: timestamp.now()
                }, { merge: true });

                // Reset usage to free limits
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);

                await usageRef.set({
                    limit: 5,
                    count: 0,
                    resetAt: timestamp.fromDate(tomorrow),
                    updatedAt: timestamp.now()
                }, { merge: true });

                const userEmail = data?.customer?.email || "Unknown";
                await sendSlackMessage(`🚫 구독 취소: [${userEmail}] 구독 취소 | ${new Date().toLocaleString('ko-KR')}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${type}`);
        }

        return { statusCode: 200, body: "OK" };
    } catch (error: any) {
        console.error("Webhook processing error:", error);
        return { statusCode: 500, body: error.message };
    }
};
