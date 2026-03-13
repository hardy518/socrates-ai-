import type { ChatSession, MessageFile } from "@/types/chat";

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
  // Prepare files with base64 data to send to the backend
  const filesWithBase64 = [];
  if (newFiles && newFiles.length > 0) {
    for (const file of newFiles) {
      try {
        const base64Data = await fileToBase64(file.url);
        filesWithBase64.push({
          name: file.name,
          type: file.type,
          base64Data: base64Data
        });
      } catch (err) {
        console.error(`Error converting file ${file.name}:`, err);
      }
    }
  }

  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/generateAIResponse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          category: session.category,
          chatMode: session.chatMode,
          depth: session.depth,
          messages: session.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        },
        userMessage,
        files: filesWithBase64
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Netlify Function call failed");
    }

    const data = await response.json() as { text: string };
    return data.text;
  } catch (error) {
    console.error("Netlify Function call failed:", error);
    throw new Error("AI 응답을 생성하는 중에 오류가 발생했습니다.");
  }
}

export async function generateFinalAnswer(session: ChatSession): Promise<string> {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/generateFinalAnswer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          category: session.category,
          problem: session.problem,
          attempts: session.attempts,
          messages: session.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Netlify Function call failed");
    }

    const data = await response.json() as { text: string };
    return data.text;
  } catch (error) {
    console.error("Netlify Function call failed:", error);
    throw new Error("최종 답변을 생성하는 중에 오류가 발생했습니다.");
  }
}

export async function analyzeInsight(userId: string, count: number): Promise<void> {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/analyzeInsight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, conversationCount: count })
    });

    if (!response.ok) {
      throw new Error("Insight analysis failed");
    }
  } catch (error) {
    console.error("Error analyzing insight:", error);
  }
}
