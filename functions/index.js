const functions = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");

const GET_SYSTEM_PROMPT = (category, mode = 'socrates', depth = 3) => {
    const isTechnical = ["수학ㆍ과학", "코딩", "데이터ㆍ분석"].includes(category);
    const baseInstruction = `당신은 AI 조력자입니다. 당신의 현재 카테고리는 [${category}]입니다. 친근하고 자연스러운 대화체를 유지하세요. 한국어로만 응답합니다.`;

    if (mode === 'direct') {
        return `${baseInstruction}
    
핵심 역할:
- 질문 없이 입력한 문제에 바로 명확하고 구체적인 답변을 제공하세요.
- 불필요한 서술이나 유도 질문은 생략하고 결론부터 제시합니다.
- 사용자가 즉각적인 해결책을 원하므로, 복잡한 내용도 핵심 위주로 명확하게 전달하세요.`;
    }

    const socratesInstruction = `${baseInstruction}

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

exports.generateAIResponse = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', '인증된 사용자만 접근 가능합니다.');
    }

    const { session, userMessage, files } = data;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new functions.https.HttpsError('internal', 'Anthropic API 키가 설정되지 않았습니다.');
    }

    const client = new Anthropic({ apiKey });
    const systemPrompt = GET_SYSTEM_PROMPT(session.category, session.chatMode, session.depth) + COMMON_RULES;

    const userContent = [{ type: "text", text: userMessage }];

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

    const history = session.messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
    }));

    const messages = [...history, { role: "user", content: userContent }];

    try {
        const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages,
        });

        const textContent = response.content.find((block) => block.type === "text");
        if (!textContent || textContent.type !== "text") {
            throw new functions.https.HttpsError('internal', 'AI가 빈 응답을 반환했습니다.');
        }

        return { text: textContent.text };
    } catch (error) {
        console.error("AI Response Error:", error);
        throw new functions.https.HttpsError('internal', 'AI 응답 생성 실패: ' + error.message);
    }
});

exports.generateFinalAnswer = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', '인증된 사용자만 접근 가능합니다.');
    }

    const { session } = data;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new functions.https.HttpsError('internal', 'Anthropic API 키가 설정되지 않았습니다.');
    }

    const client = new Anthropic({ apiKey });

    const conversationSummary = session.messages
        .map(msg => `${msg.role === 'user' ? '유저' : 'AI'}: ${msg.content}`)
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
        const response = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            messages: [{ role: "user", content: finalPrompt }],
        });

        const textContent = response.content.find((block) => block.type === "text");
        if (!textContent || textContent.type !== "text") {
            throw new functions.https.HttpsError('internal', 'AI가 빈 응답을 반환했습니다.');
        }

        return { text: textContent.text };
    } catch (error) {
        console.error("Final Answer Error:", error);
        throw new functions.https.HttpsError('internal', '최종 답변 생성 실패: ' + error.message);
    }
});
