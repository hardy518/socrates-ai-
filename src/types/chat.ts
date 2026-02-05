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

export interface ChatSession {
  id: string;
  title: string;
  problem: string;
  attempts: string;
  goal: string;
  depth: number;
  currentStep: number;
  messages: Message[];
  isResolved: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionForm {
  problem: string;
  attempts: string;
  goal: string;
}
