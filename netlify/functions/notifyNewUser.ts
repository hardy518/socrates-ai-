import { Handler } from "@netlify/functions";

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const handler: Handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: "Method Not Allowed" };
    }

    const slackUrl = process.env.SLACK_PAYMENT_ALERT_WEBHOOK_URL;
    if (!slackUrl) {
        return { statusCode: 500, headers, body: "Slack URL not configured" };
    }

    try {
        const { email, displayName } = JSON.parse(event.body || "{}");

        const now = new Date().toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Seoul',
        });

        await fetch(slackUrl, {
            method: "POST",
            body: JSON.stringify({
                text: `🎉 신규 가입: [${email || "이메일 없음"}] | ${displayName || "이름 없음"} | Google | ${now}`,
            }),
        });

        return { statusCode: 200, headers, body: "OK" };
    } catch (error: any) {
        console.error("notifyNewUser error:", error);
        return { statusCode: 500, headers, body: error.message };
    }
};
