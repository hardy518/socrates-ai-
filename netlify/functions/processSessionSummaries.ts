import { Handler, schedule } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const firebaseConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (!getApps().length) {
    initializeApp({
        credential: cert(firebaseConfig)
    });
}

const db = getFirestore();
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// 매 10분마다 실행되는 스케줄러
const handler: Handler = async (event) => {
    console.log("Starting session summary processing...");

    try {
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

        // 30분 이상 지났고 요약되지 않은 세션들 찾기
        const sessionsSnapshot = await db.collection("conversations")
            .where("isSummarized", "==", false)
            .where("updatedAt", "<", Timestamp.fromDate(thirtyMinutesAgo))
            .limit(10) // 한 번에 상위 10개만 처리
            .get();

        if (sessionsSnapshot.empty) {
            console.log("No sessions to summarize.");
            return { statusCode: 200 };
        }

        for (const doc of sessionsSnapshot.docs) {
            const session = doc.data();
            const conversationId = doc.id;
            const userId = session.userId;

            if (!userId) continue;

            const conversationText = session.messages
                .map((msg: any) => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`)
                .join("\n\n");

            const prompt = `다음은 사용자와 AI의 대화 내역입니다. 대화 내용을 바탕으로 사용자가 탐구한 핵심 내용을 30자 이내의 한 문장으로 요약하세요.

조건:
- 사용자가 어떤 주제에 대해 고민하고 무엇을 탐구했는지 그 핵심을 요약하세요.
- 만약 요약할 만한 유의미한 탐구 내용이 없다면 "null"이라고 답변하세요.
- 답변은 오직 요약된 문장만 출력하거나 "null" 단어 하나만 출력하세요.

=== 대화 내역 ===
${conversationText}`;

            try {
                const msg = await anthropic.messages.create({
                    model: "claude-haiku-4-5",
                    max_tokens: 100,
                    system: "당신은 사용자가 탐구한 핵심 내용을 요약하는 분석기입니다. 30자 이내로 요약하거나 null만 반환하세요.",
                    messages: [{ role: "user", content: prompt }],
                });

                const learned = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
                const filteredLearned = learned === "null" || learned === "" ? null : learned;

                // Firestore에 요약 정보 저장
                await db.collection("users").doc(userId).collection("sessionSummaries").doc(conversationId).set({
                    category: session.category || "기타",
                    problem: session.problem || "제목 없음",
                    learned: filteredLearned,
                    createdAt: Timestamp.now(),
                    conversationId: conversationId
                });

                // 원본 대화에 요약 완료 표시
                await doc.ref.update({ isSummarized: true });
                console.log(`Summarized session: ${conversationId}`);

            } catch (error) {
                console.error(`Error processing session ${conversationId}:`, error);
                // 개별 섹션 실패 시 건너뛰고 계속 진행
            }
        }

        return { statusCode: 200 };
    } catch (error) {
        console.error("Critical error in processSessionSummaries:", error);
        return { statusCode: 500 };
    }
};

export const scheduledHandler = schedule("*/10 * * * *", handler);
