export type SupportedLanguage = 'ko' | 'en';

export const detectUserLanguage = (): SupportedLanguage => {
    const savedLanguage = localStorage.getItem('preferred_language');
    if (savedLanguage === 'ko' || savedLanguage === 'en') {
        return savedLanguage;
    }

    const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';

    if (browserLang.toLowerCase().startsWith('ko')) {
        return 'ko';
    }

    return 'en';
};

export const saveLanguagePreference = (language: SupportedLanguage): void => {
    localStorage.setItem('preferred_language', language);
};
