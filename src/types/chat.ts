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
  feedback?: 'like' | 'dislike';
}

export type Category = "Math & Science" | "Coding" | "Business & Planning" | "Writing & Foreign Language" | "Data & Analysis" | "Etc";

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
  count?: number;
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

  depth: number;
  currentStep: number;
  messages: Message[];
  isResolved: boolean;
  isSummarized?: boolean;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionForm {
  category: Category;
  problem: string;
  files?: MessageFile[];
}
