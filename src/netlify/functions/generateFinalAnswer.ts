import { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

export const handler: Handler = async (event) => {
    // CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: "Method Not Allowed" };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Anthropic API key is not configured.",
                debug: {
                    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
                    hasViteAnthropic: !!process.env.VITE_ANTHROPIC_API_KEY
                }
            })
        };
    }

    const { session } = JSON.parse(event.body || "{}");
    const client = new Anthropic({ apiKey });

    const conversationSummary = session.messages
        .map((msg: any) => `${msg.role === 'user' ? '유저' : 'AI'}: ${msg.content}`)
        .join('\n\n');

    const finalPrompt = `다음은 사용자와의 전체 대화 내용입니다:

카테고리: ${session.category}
문제: ${session.problem}
현재 시도/배경: ${session.attempts}

=== 대화 내용 ===
${conversationSummary}

=== 요청 ===
위 대화를 바탕으로, 사용자가 목표를 달성하기 위한 구체적이고 실행 가능한 해결 방안을 제시해주세요.

중요 지침:
- 이미지 마크다운(![])은 절대 사용하지 마세요
- 불필요한 특수문자나 장식은 피하세요
- 코딩, 수학, 과학 등 정답이 명확한 주제는 명확한 답변을 제공하세요
- 일반 텍스트 형식으로 깔끔하게 작성하세요

포함 내용:
1. 핵심 통찰: 대화를 통해 발견한 가장 중요한 깨달음
2. 실행 계획: 구체적으로 무엇을, 어떤 순서로 해야 하는지
3. 예상 효과: 이 방법이 왜 효과적인지
4. 주의사항: 실행 시 주의할 점

따뜻하고 격려하는 톤으로, 실질적인 조언을 제공하세요.`;

    try {
        const response: any = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            messages: [{ role: "user", content: finalPrompt }],
        });

        const textContent = response.content.find((block: any) => block.type === "text");
        if (!textContent) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: "AI returned an empty response." })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ text: textContent.text })
        };
    } catch (error: any) {
        console.error("Final Answer Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
