import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
    // CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            message: "Netlify Functions Environment Debugger",
            hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
            hasViteAnthropic: !!process.env.VITE_ANTHROPIC_API_KEY,
            envKeys: Object.keys(process.env).filter(key => key.includes('API') || key.includes('ANTHROPIC') || key.includes('VITE') || key.includes('FIREBASE'))
        })
    };
};
