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

export type Category = "수학ㆍ과학" | "코딩" | "비즈니스ㆍ기획" | "글쓰기ㆍ외국어" | "데이터ㆍ분석";
export type ChatMode = 'socrates' | 'direct';

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
