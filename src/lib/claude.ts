import Anthropic from "@anthropic-ai/sdk";
import type { ChatSession, Message, MessageFile } from "@/types/chat";

const GET_SYSTEM_PROMPT = (category: string) => {
  const isTechnical = ["수학ㆍ과학", "코딩", "데이터ㆍ분석"].includes(category);

  const baseInstruction = `당신은 소크라테스식 대화를 이끄는 AI 조력자입니다. 당신의 현재 카테고리는 [${category}]입니다.
  
친근하고 자연스러운 대화체를 유지하세요. 한국어로만 응답합니다.`;

  if (isTechnical) {
    return `${baseInstruction}

핵심 역할:
- 사용자가 스스로 답을 발견하도록 유도하는 것이 최우선 과제입니다.
- 절대 답을 직접적으로 알려주지 마세요.
- 질문과 짧은 힌트를 조합하여 사용자가 한 단계씩 나아가게 돕습니다.
- 대화 단계(고민 단계)가 깊어질수록 힌트를 점점 구체적으로 제공하세요.
- 마지막 단계 직전에는 정답에 매우 가까운 결정적인 힌트를 제공하세요.

대화 방식:
1. 질문 중심: 답변 대신 깊이 있는 질문을 던집니다.
2. 예시 활용: 추상적인 개념은 구체적인 예시로 설명합니다.
3. 힌트 조절: 사용자의 이해도에 따라 힌트의 강도를 조절합니다.`;
  } else {
    return `${baseInstruction}

핵심 역할:
- 사용자의 생각을 확장하고 탐구할 수 있도록 돕는 것이 목적입니다.
- 정답을 유도하지 말고, 질문만으로 대화를 진행하세요.
- 다양한 관점에서 문제를 바라볼 수 있도록 시야를 넓혀주는 질문을 던지세요.
- 결론을 내기보다 탐구 과정 자체를 즐길 수 있도록 유도하세요.

대화 방식:
1. 열린 질문: "예/아니오"로 답할 수 없는 열린 질문을 주로 사용합니다.
2. 관점 전환: "만약 ~라면 어떨까요?"와 같은 질문으로 새로운 시각을 제시합니다.
3. 공감과 경청: 사용자의 맥락을 충분히 이해하고 그에 기반한 질문을 합니다.`;
  }
};

const COMMON_RULES = `
특별 상황 대응:
- 답을 찾았을 때: 사용자가 명확한 결론이나 실행 계획을 말하면, 반드시 응답 시작 부분에 "[ANSWER_FOUND]" 태그를 붙이고 격려하세요.
- 방향 이탈: 원래의 고민 주제에서 벗어나면 부드럽게 다시 주제로 돌아오도록 안내하세요.

스타일:
- 짧고 명료하게, 한 번에 1-2개의 질문만 합니다.
- 판단이나 충고 없이, 성찰을 유도하는 질문을 사용합니다.`;

function getApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key || key === "your_anthropic_api_key_here") {
    throw new Error("Anthropic API 키가 설정되지 않았습니다. .env.local에 VITE_ANTHROPIC_API_KEY를 설정해주세요.");
  }
  return key;
}

async function fileToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateAIResponse(
  session: ChatSession,
  userMessage: string,
  newFiles?: MessageFile[]
): Promise<string> {
  const apiKey = getApiKey();
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const systemPrompt = GET_SYSTEM_PROMPT(session.category) + COMMON_RULES;

  // Prepare content for the current user message
  const userContent: any[] = [{ type: "text", text: userMessage }];

  // Handle files
  if (newFiles && newFiles.length > 0) {
    for (const file of newFiles) {
      try {
        const base64Data = await fileToBase64(file.url);
        if (file.type.startsWith('image/')) {
          userContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as any,
              data: base64Data,
            },
          });
        } else if (file.type === 'application/pdf') {
          userContent.push({
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Data,
            },
          });
        }
      } catch (err) {
        console.error(`Error converting file ${file.name}:`, err);
      }
    }
  }

  // Convert history to Claude format
  const history = session.messages.map(msg => {
    return {
      role: msg.role === "user" ? "user" as const : "assistant" as const,
      content: msg.content
    };
  });

  const messages = [...history, { role: "user" as const, content: userContent }];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages,
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  return textContent.text;
}

export async function generateFinalAnswer(session: ChatSession): Promise<string> {
  const apiKey = getApiKey();
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  // 대화 히스토리 정리
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

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: finalPrompt }],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  return textContent.text;
}