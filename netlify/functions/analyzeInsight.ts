import { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { userId, conversationCount } = JSON.parse(event.body || '{}');

  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'User ID is required' }) };
  }

  try {
    // 1. Fetch user data for name and previous spectrums
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    const userName = userData.displayName || '사용자';
    const lastMonthSpectrums = userData.insight?.spectrums || null;

    // 2. Fetch recent 30 conversations
    const conversationsSnapshot = await db.collection('conversations')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(30)
      .get();

    const conversations = conversationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '제목 없음',
        category: data.category || '기타'
      };
    });

    // 3. Prepare prompt
    const prompt = `
사용자명: ${userName}
분석 대화 수: ${conversationCount}개
대화 목록 (최근 30개):
${JSON.stringify(conversations, null, 2)}

지난달 성향값: ${JSON.stringify(lastMonthSpectrums)}

아래 JSON 형식으로만 응답:
{
  "categories": [{"name": string, "count": number}],
  "deepConversations": [
    {"title": string, "conversationId": string}
  ],
  "spectrums": {
    "whyVsHow": number,
    "emotionVsLogic": number,
    "processVsResult": number
  },
  "spectrumChanges": {
    "whyVsHow": number | null,
    "emotionVsLogic": number | null,
    "processVsResult": number | null
  },
  "comment": string
}

기준:
- categories: 전체 순위 내림차순, 사용한 카테고리만 포함
- deepConversations: 최대 3개, 제목에서 주제가 깊거나 구체적인 대화 우선, 제목은 원본 그대로 사용, conversationId는 대화 목록의 id 사용
- whyVsHow: 높을수록 '왜?' 방향 (0=어떻게, 100=왜)
  성장 모드 (소크라테스식 대화)의 깊이가 반영됨 
- emotionVsLogic: 높을수록 감성적 (0=논리, 100=감성)
- processVsResult: 높을수록 과정 지향 (0=결론, 100=과정)
  성장 모드 (소크라테스식 대화)의 깊이가 반영됨 
- spectrumChanges: 지난달 대비 delta (이번값 - 지난달값), 지난달값이 null이면 모두 null
- comment: 카테고리 + 성향을 자연스럽게, 따뜻한 톤, "이번 달 ${userName}님은 ..." 으로 시작, 2문장 내외
`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      system: "당신은 소크라테스 AI의 사용자 성향 분석기입니다. JSON만 반환하세요. 설명, 백틱, 마크다운 없이.",
      messages: [{ role: "user", content: prompt }],
    });

    const resultText = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const insightData = JSON.parse(resultText);

    // 4. Save insight to Firestore
    await userRef.update({
      insight: {
        ...insightData,
        updatedAt: FieldValue.serverTimestamp(),
        lastMonthSpectrums: lastMonthSpectrums || insightData.spectrums
      },
      insightBadge: true,
      updatedAt: FieldValue.serverTimestamp()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Insight analysis failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (error as Error).message })
    };
  }
};
