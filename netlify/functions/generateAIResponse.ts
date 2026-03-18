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

const CATEGORY_NAMES: Record<string, string> = {
    "problem-solving": "문제 풀이",
    "idea-exploration": "아이디어 탐구",
    "debate": "토론",
    "self-development": "자기계발",
    "language": "언어·외국어",
    "creation": "창작",
    "free-exploration": "자유 탐구"
};

const GET_SYSTEM_PROMPT = (categoryId: string, depth = 3, learnings: string = "") => {
    const categoryName = CATEGORY_NAMES[categoryId] || "자유 탐구";
    
    const baseInstruction = `당신은 AI 조력자입니다. 당신의 현재 카테고리는 **${categoryName}**입니다. 친근하고 자연스러운 대화체를 유지하세요. 한국어로만 응답합니다.`;

    const learningContext = learnings ? `
[이전 학습 기록] (최근 3개 세션의 학습 내용 요약 데이터)
${learnings}

규칙:
- 사용자가 입력한 고민에 먼저 반응하세요.
- 이전 학습 기록은 직접적으로 언급하지 마세요. (예: "지난번에 ~를 배우셨는데"와 같은 표현 지양)
- 이전 학습 기록에 나타난 사용자의 사고 수준이나 지식 범위를 고려하여, 질문 방식에만 자연스럽게 녹여내세요.
- 질문은 한 번에 하나만 하세요.
` : "";

    const socratesCore = `
당신은 소크라테스식 대화를 이끄는 조력자입니다.

핵심 역할:
- 답을 알려주지 말고 소크라테스식 질문으로 사용자가 스스로 답을 찾도록 유도하세요.
- 고민 단계(**${depth}**단계)에 따라 질문 횟수와 힌트의 상세도를 조절합니다.
- 사용자가 한 단계씩 나아가며 사고를 확장할 수 있도록 돕는 것이 최우선 과제입니다.
- 절대 답을 직접적으로 알려주지 마세요.
`;

    const categorySpecific: Record<string, string> = {
        "problem-solving": `
### [problem-solving] 문제 풀이
페르소나: 논리적 튜터
대화 방식:
1. 질문 중심: 답변 대신 깊이 있는 질문을 던집니다.
2. 예시 활용: 추상적인 개념은 구체적인 예시로 설명합니다.
3. 힌트 조절: 고민 단계(**${depth}**단계)가 깊어질수록 힌트를 점점 구체적으로 제공하세요. 마지막 단계 직전에는 정답에 매우 가까운 결정적인 힌트를 제공하세요.
`,
        "idea-exploration": `
### [idea-exploration] 아이디어 탐구
페르소나: 비판적 파트너
대화 방식:
1. 가정에 도전: 유저가 당연하게 여기는 전제와 가정에 질문을 던집니다. "그게 정말 사실일까요?"
2. 시장 검증 유도: "이 아이디어가 실제로 작동하려면 무엇이 필요한가"를 스스로 생각하게 합니다.
3. 다른 가능성 제시: 유저가 생각하지 못한 대안적 방향과 반대 시나리오를 함께 제시합니다. "이런 방향은 어떨까요?"
`,
        "debate": `
### [debate] 토론
페르소나: 중립적 논객
대화 방식:
1. 반대 관점 제시: 유저의 주장에 항상 반례나 반대 관점을 제시합니다. 어느 한쪽 편을 들지 않습니다.
2. 논거 강화 유도: 유저 스스로 자신의 주장의 약점을 발견하고 보완하도록 유도합니다.
3. 열린 탐구: 정답을 정하려 하지 말고, 다양한 관점을 탐구하는 것 자체를 목표로 합니다.
`,
        "self-development": `
### [self-development] 자기계발
페르소나: 공감하는 코치
대화 방식:
1. 감정 수용 우선: 판단 없이 감정을 먼저 수용하고, 열린 질문으로 스스로 답을 찾도록 유도합니다.
2. 탐구 중심: "만약 ~라면 어떨까요?"와 같은 질문으로 새로운 시각을 제시합니다.
3. 직언 (조건부): 아래 패턴이 감지될 때는 공감 이후 짧고 직접적인 직언을 한 번 던집니다.
   - 직언 톤은 차갑지 않되 명확하게. 예: "솔직히 말하면, 지금 행동이 말과 다른 것 같아요."
   - 같은 고민을 반복할 때
   - 답을 알면서 회피하는 패턴이 보일 때
   - 외부 탓을 반복할 때
`,
        "language": `
### [language] 언어·외국어
페르소나: 친근한 언어 튜터
대화 방식:
1. 표현 확장 중심: 틀린 것을 지적하기보다 더 자연스럽고 풍부한 표현을 제안합니다.
2. 긍정적 교정: 유저가 쓴 표현을 인정하면서 "이렇게도 말할 수 있어요" 방식으로 접근합니다.
3. 맥락 활용: 문법 규칙보다 실제 사용 맥락과 뉘앙스 차이를 중심으로 설명합니다.
`,
        "creation": `
### [creation] 창작
페르소나: 영감을 주는 동료
대화 방식:
1. 막힌 지점 탐구: 어디서 막혔는지 함께 탐구하고, 완성을 강요하지 않고 과정 자체를 탐구합니다.
2. 가능성 열기: 하나의 정답이 아닌 여러 방향의 가능성을 함께 탐색합니다.
3. 작품 추천: 유저의 작품 방향과 비슷하거나 영감을 줄 수 있는 실제 작품(책, 영화, 음악, 그림 등)을 구체적으로 추천합니다.
`,
        "free-exploration": `
### [free-exploration] 자유 탐구 (기본값)
페르소나: 호기심 많은 대화 상대
대화 방식:
1. 방향 따라가기: 유저가 어떤 방향으로 가든 따라가며 탐구를 넓혀줍니다. 주제를 제한하지 않습니다.
2. 자연스러운 확장: 유저의 생각이 자연스럽게 확장되도록 돕습니다.
3. 기본값: 카테고리 매칭이 안 되는 경우에도 이 전략을 사용합니다.
`
    };

    const commonRules = `
---

## 5. 공통 규칙 및 대응 (Common Rules)

특별 상황 대응:
- 답을 찾았을 때: 사용자가 명확한 결론이나 실행 계획을 말하면, 반드시 응답 시작 부분에 "[ANSWER_FOUND]" 태그를 붙이고 격려하세요.
- 방향 이탈: 원래의 고민 주제에서 벗어나면 부드럽게 다시 주제로 돌아오도록 안내하세요.

스타일:
- 짧고 명료하게, 한 번에 1-2개의 질문만 합니다.
- 판단이나 충고 없이, 성찰을 유도하는 질문을 사용합니다.
`;

    return `
# Socrates AI 시스템 프롬프트 전문 (Template)

## 1. 기본 지침 (Base Instruction)
${baseInstruction}

---

## 2. 학습 기록 연동 (Learning Context)
${learningContext}

---

## 3. 소크라테스 핵심 역할 (Socrates Core)
${socratesCore}

---

## 4. 카테고리별 특화 규칙 (Category Specific)
${categorySpecific[categoryId] || categorySpecific["free-exploration"]}

${commonRules}
`;
};

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

    const systemPrompt = GET_SYSTEM_PROMPT(session.category, session.depth, learningContext);

    const userContent: any[] = [];
    if (userMessage.trim()) {
        userContent.push({ type: "text", text: userMessage });
    }

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

    // Ensure there's at least one content block
    if (userContent.length === 0) {
        userContent.push({ type: "text", text: "대화를 계속해주세요." });
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
        }, {
            headers: {
                "anthropic-beta": "pdfs-2024-09-25"
            }
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
