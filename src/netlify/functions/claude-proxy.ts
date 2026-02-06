import { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

export const handler: Handler = async (event) => {
  // POST 요청만 허용
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // VITE_ 접두사가 없는 순수한 ANTHROPIC_API_KEY를 서버 환경변수에서 가져옵니다.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "서버에 Anthropic API 키가 설정되지 않았습니다." }) 
    };
  }

  const client = new Anthropic({ apiKey });

  try {
    const { model, max_tokens, system, messages } = JSON.parse(event.body || "{}");

    const response = await client.messages.create({
      model: model || "claude-3-5-sonnet-20240620",
      max_tokens: max_tokens || 1024,
      system: system,
      messages: messages,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};