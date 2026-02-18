import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupportedLanguage, detectUserLanguage, saveLanguagePreference } from '@/utils/detectLanguage';
import { translations, TranslationKey } from '@/i18n/translations';

interface LanguageContextType {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<SupportedLanguage>('ko');

    useEffect(() => {
        const detectedLanguage = detectUserLanguage();
        setLanguageState(detectedLanguage);
    }, []);

    const setLanguage = (lang: SupportedLanguage) => {
        setLanguageState(lang);
        saveLanguagePreference(lang);
    };

    const t = (key: TranslationKey): string => {
        return translations[language][key];
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
