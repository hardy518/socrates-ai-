import { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

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
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  try {
    const { userId } = JSON.parse(event.body || "{}");
    if (!userId) return { statusCode: 400, headers, body: "UserId is required" };

    const apiSecret = process.env.PORTONE_V2_API_SECRET;
    if (!apiSecret) throw new Error("API Secret is missing");

    const subRef = db.collection("users").doc(userId).collection("subscription").doc("current");
    const subDoc = await subRef.get();
    
    if (!subDoc.exists || subDoc.data()?.status !== 'active') {
      return { statusCode: 400, headers, body: "No active subscription found" };
    }

    const subData = subDoc.data();
    const nextScheduledAt = subData?.nextScheduledAt;

    if (nextScheduledAt) {
      // 1. Cancel PortOne Schedule
      const scheduleId = `schedule_${userId}_${nextScheduledAt.toDate().getTime()}`;
      
      try {
        const cancelResponse = await fetch(`https://api.portone.io/schedules-cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `PortOne ${apiSecret}`,
          },
          body: JSON.stringify({
            scheduleIds: [scheduleId]
          }),
        });

        if (!cancelResponse.ok) {
          const errorMsg = await cancelResponse.text();
          console.error("PortOne cancellation error:", errorMsg);
          // Still proceed to update Firestore if the schedule might not exist or already canceled
        }
      } catch (err) {
        console.error("Failed to call PortOne cancel API:", err);
      }
    }

    // 2. Update Firestore
    await subRef.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    // 3. Update top-level doc
    await db.collection("users").doc(userId).update({
      subscription: {
        status: 'cancelled',
        cancelledAt: admin.firestore.Timestamp.now()
      },
      updatedAt: admin.firestore.Timestamp.now()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Subscription cancelled successfully" }),
    };
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
