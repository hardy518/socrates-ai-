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
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const { userId, billingKey } = JSON.parse(event.body || "{}");
    if (!userId || !billingKey) return { statusCode: 400, headers, body: "UserId and BillingKey are required" };

    const apiSecret = process.env.PORTONE_V2_API_SECRET;
    
    // 1. Fetch billing key info to get card brand and last4
    const response = await fetch(`https://api.portone.io/billing-keys/${encodeURIComponent(billingKey)}`, {
      headers: { "Authorization": `PortOne ${apiSecret}` }
    });

    let cardLast4 = "";
    let cardBrand = "";

    if (response.ok) {
      const result = await response.json();
      const cardInfo = result.method?.card;
      cardLast4 = cardInfo?.number || "";
      cardBrand = cardInfo?.brand || "";
    }

    // 2. Update Firestore
    await db.collection("users").doc(userId).collection("subscription").doc("current").update({
      billingKey,
      cardLast4,
      cardBrand,
      updatedAt: admin.firestore.Timestamp.now()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Billing key updated", cardLast4, cardBrand }),
    };
  } catch (error: any) {
    console.error("Update billing key error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ message: error.message }) };
  }
};
