import { SupportedLanguage } from '@/utils/detectLanguage';

export const translations = {
    ko: {
        mainTitle: "Think deeper.",
        dailyLimitReached: "오늘의 무료 사용 횟수(2회)를 모두 사용했습니다. 내일 다시 이용해주세요!",
        usageLimitReached: "사용 횟수 제한에 도달했습니다.",
        sessionCreateFailed: "세션 생성에 실패했습니다.",
        newSession: "새 대화",
        send: "보내기",
        resolve: "완료",
        delete: "삭제",
        problem: "문제",
        attempts: "시도",

        sessions: "대화 목록",
        settings: "설정",
        language: "언어",
        korean: "한국어",
        english: "English",
        loading: "로딩 중...",
        cancel: "취소",
        confirm: "확인",
        cropInstruction: "풀고 싶은 문제를 잘라주세요",
    },
    en: {
        mainTitle: "Think deeper.",
        dailyLimitReached: "You've used all your free sessions (2) for today. Please try again tomorrow!",
        usageLimitReached: "Usage limit reached.",
        sessionCreateFailed: "Failed to create session.",
        newSession: "New Chat",
        send: "Send",
        resolve: "Complete",
        delete: "Delete",
        problem: "Problem",
        attempts: "Attempts",

        sessions: "Conversations",
        settings: "Settings",
        language: "Language",
        korean: "한국어",
        english: "English",
        loading: "Loading...",
        cancel: "Cancel",
        confirm: "Confirm",
        cropInstruction: "Crop the problem you want to solve",
    }
} as const;

export type TranslationKey = keyof typeof translations.ko;

export const t = (key: TranslationKey, language: SupportedLanguage): string => {
    return translations[language][key];
};
