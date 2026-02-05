import Anthropic from "@anthropic-ai/sdk";
import type { ChatSession, Message } from "@/types/chat";

const SOCRATIC_SYSTEM_INSTRUCTION = `당신은 소크라테스식 대화를 이끄는 AI 조력자입니다.

핵심 역할:
- 정답을 직접 알려주지 않고, 질문을 통해 사용자가 스스로 깨달아가도록 돕습니다.
- 사용자의 문제(problem), 시도(attempts), 목표(goal)를 항상 염두에 두고 대화합니다.

대화 방식:
1. 질문 중심: 답변 대신 깊이 있는 질문을 던집니다.
2. 구체적 예시: 추상적 질문에는 구체적 상황이나 예시를 함께 제시합니다.
   예: "UI 도구를 고민 중이시군요. 예를 들어 러버블은 노코드 방식이고, 커서는 AI 코딩 도우미입니다. 각각의 장단점을 비교해보셨나요?"
3. 대안 제시: 사용자가 한 방향만 보고 있다면, 다른 가능성과 그 이유를 함께 제시합니다.
   예: "그 방법 외에 __를 고려해볼 수도 있어요. 이 방법은 __한 장점이 있고, __할 때 특히 효과적입니다. 어떻게 생각하시나요?"

특별 상황 대응:
- 답을 찾았을 때: 사용자가 명확한 결론이나 실행 계획을 말하면, 반드시 응답 시작 부분에 "[ANSWER_FOUND]" 태그를 붙이고, "좋은 통찰이네요! 스스로 답을 찾으셨습니다. 지금 '정답 보기'를 통해 실행 계획을 확인하실 수도 있고, 다른 가능성도 함께 고민해보실 수도 있어요." 라고 말합니다.
- 방향 이탈: 사용자의 대화가 원래 목표와 동떨어진 방향으로 가면, 냉정하게 지적합니다.
   예: "잠깐, 원래 목표는 [goal]이었는데 지금은 다른 이야기를 하고 계신 것 같아요. 다시 본질로 돌아가볼까요?"

스타일:
- 짧고 명료하게, 한 번에 1-2개의 질문만 합니다.
- 판단이나 충고 없이, 성찰을 유도하는 질문을 사용합니다.
- 한국어로만 응답합니다.`;

function getApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key || key === "your_anthropic_api_key_here") {
    throw new Error("Anthropic API 키가 설정되지 않았습니다. .env.local에 VITE_ANTHROPIC_API_KEY를 설정해주세요.");
  }
  return key;
}

function sessionToMessages(messages: Message[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
  }));
}

export async function generateAIResponse(session: ChatSession, userMessage: string): Promise<string> {
  const apiKey = getApiKey();
  const client = new Anthropic({ 
    apiKey,
    dangerouslyAllowBrowser: true 
  });

  const history = sessionToMessages(session.messages);
  const messages = [...history, { role: "user" as const, content: userMessage }];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SOCRATIC_SYSTEM_INSTRUCTION,
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

문제: ${session.problem}
시도: ${session.attempts}
목표: ${session.goal}

=== 대화 내용 ===
${conversationSummary}

=== 요청 ===
위 대화를 바탕으로, 사용자가 목표를 달성하기 위한 구체적이고 실행 가능한 해결 방안을 제시해주세요.

포함 내용:
1. 핵심 통찰: 대화를 통해 발견한 가장 중요한 깨달음
2. 실행 계획: 구체적으로 무엇을, 어떤 순서로 해야 하는지
3. 예상 효과: 이 방법이 왜 효과적인지
4. 주의사항: 실행 시 주의할 점

따뜻하고 격려하는 톤으로, 실질적인 조언을 제공하세요.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: finalPrompt }],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("AI가 빈 응답을 반환했습니다.");
  }

  return textContent.text;
}