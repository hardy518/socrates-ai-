export interface MessageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  files?: MessageFile[];
}

export type Category = "수학ㆍ과학" | "코딩" | "비즈니스ㆍ기획" | "글쓰기ㆍ외국어" | "데이터ㆍ분석" | "기타";
export type ChatMode = 'socrates' | 'direct';

export interface Spectrums {
  whyVsHow: number;
  emotionVsLogic: number;
  processVsResult: number;
}

export interface CategoryStat {
  name: string;
  count: number;
}

export interface DeepConversation {
  title: string;
  conversationId: string;
}

export interface Insight {
  updatedAt: number;
  categories: CategoryStat[];
  deepConversations: DeepConversation[];
  spectrums: Spectrums;
  spectrumChanges: {
    whyVsHow: number | null;
    emotionVsLogic: number | null;
    processVsResult: number | null;
  };
  comment: string;
  lastMonthSpectrums: Spectrums | null;
}

export interface ChatSession {
  id: string;
  title: string;
  category: Category;
  problem: string;
  attempts: string;

  depth: number;
  currentStep: number;
  messages: Message[];
  isResolved: boolean;
  chatMode?: ChatMode;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionForm {
  category: Category;
  problem: string;
  attempts: string;
  files?: MessageFile[];
}
