import { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin 초기화
const firebaseConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!getApps().length) {
    initializeApp({
        credential: cert(firebaseConfig)
    });
}

const db = getFirestore();

const GET_SYSTEM_PROMPT = (category: string, depth = 3, learnings: string = "") => {
    const isTechnical = ["수학ㆍ과학", "코딩", "데이터ㆍ분석"].includes(category);
    const baseInstruction = `당신은 AI 조력자입니다. 당신의 현재 카테고리는 [${category}]입니다. 친근하고 자연스러운 대화체를 유지하세요. 한국어로만 응답합니다.`;

    const learningContext = learnings ? `
[이전 학습 기록]
${learnings}

규칙:
- 사용자가 입력한 고민에 먼저 반응하세요.
- 이전 학습 기록은 직접적으로 언급하지 마세요. (예: "지난번에 ~를 배우셨는데"와 같은 표현 지양)
- 이전 학습 기록에 나타난 사용자의 사고 수준이나 지식 범위를 고려하여, 질문 방식에만 자연스럽게 녹여내세요.
- 질문은 한 번에 하나만 하세요.
` : "";

    const socratesInstruction = `${baseInstruction}
${learningContext}

당신은 소크라테스식 대화를 이끄는 조력자입니다.

핵심 역할:
- 답을 알려주지 말고 소크라테스식 질문으로 사용자가 스스로 답을 찾도록 유도하세요.
- 고민 단계(${depth}단계)에 따라 질문 횟수와 힌트의 상세도를 조절합니다.
- 사용자가 한 단계씩 나아가며 사고를 확장할 수 있도록 돕는 것이 최우선 과제입니다.
- 절대 답을 직접적으로 알려주지 마세요.`;

    if (isTechnical) {
        return `${socratesInstruction}

대화 방식:
1. 질문 중심: 답변 대신 깊이 있는 질문을 던집니다.
2. 예시 활용: 추상적인 개념은 구체적인 예시로 설명합니다.
3. 힌트 조절: 고민 단계(${depth}단계)가 깊어질수록 힌트를 점점 구체적으로 제공하세요. 마지막 단계 직전에는 정답에 매우 가까운 결정적인 힌트를 제공하세요.`;
    } else {
        return `${socratesInstruction}

대화 방식:
1. 열린 질문: "예/아니오"로 답할 수 없는 열린 질문을 주로 사용합니다.
2. 관점 전환: "만약 ~라면 어떨까요?"와 같은 질문으로 새로운 시각을 제시합니다.
3. 공감과 경청: 사용자의 맥락을 충분히 이해하고 그에 기반한 질문을 하며, 고민 단계(${depth}단계)에 맞춰 탐구의 깊이를 조절합니다.`;
    }
};

const COMMON_RULES = `
특별 상황 대응:
- 답을 찾았을 때: 사용자가 명확한 결론이나 실행 계획을 말하면, 반드시 응답 시작 부분에 "[ANSWER_FOUND]" 태그를 붙이고 격려하세요.
- 방향 이탈: 원래의 고민 주제에서 벗어나면 부드럽게 다시 주제로 돌아오도록 안내하세요.

스타일:
- 짧고 명료하게, 한 번에 1-2개의 질문만 합니다.
- 판단이나 충고 없이, 성찰을 유도하는 질문을 사용합니다.`;

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
            body: JSON.stringify({ error: "Anthropic API key is not configured." })
        };
    }

    const { session, userMessage, files, userId } = JSON.parse(event.body || "{}");
    const client = new Anthropic({ apiKey });

    // 1. 이전 메시지 요약(Learnings) 가져오기
    let learningContext = "";
    if (userId) {
        try {
            const summariesSnapshot = await db.collection('users').doc(userId).collection('sessionSummaries')
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();

            if (!summariesSnapshot.empty) {
                learningContext = summariesSnapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return `- [${data.category}] ${data.problem} → 배운 것: ${data.learned || '없음'}`;
                    })
                    .join('\n');
            }
        } catch (error) {
            console.error("Error fetching session summaries:", error);
            // 에러 시 조용히 실패 (기능 영향 최소화)
        }
    }

    const systemPrompt = GET_SYSTEM_PROMPT(session.category, session.depth, learningContext) + COMMON_RULES;

    const userContent: any[] = [{ type: "text", text: userMessage }];

    if (files && files.length > 0) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                userContent.push({
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: file.type,
                        data: file.base64Data,
                    },
                });
            } else if (file.type === 'application/pdf') {
                userContent.push({
                    type: "document",
                    source: {
                        type: "base64",
                        media_type: "application/pdf",
                        data: file.base64Data,
                    },
                });
            }
        }
    }

    const history = session.messages.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
    }));

    const anthropicMessages = [...history, { role: "user", content: userContent }];

    try {
        const response: any = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 4096,
            messages: anthropicMessages,
            system: systemPrompt,
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
        console.error("AI Response Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
