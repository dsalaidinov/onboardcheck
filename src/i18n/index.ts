// src/i18n/index.ts
import { create } from 'zustand';
import { ru, type TranslationKeys } from './locales/ru';
import { en } from './locales/en';
import { kg } from './locales/kg';

export type SupportedLanguage = 'ru' | 'en' | 'kg';

const LOCALES: Record<SupportedLanguage, TranslationKeys> = {
  ru,
  en,
  kg,
};

export const LANGUAGE_NAMES: Record<SupportedLanguage, { name: string; flag: string }> = {
  ru: { name: 'Русский', flag: '🇷🇺' },
  kg: { name: 'Кыргызча', flag: '🇰🇬' },
  en: { name: 'English', flag: '🇬🇧' },
};

interface I18nState {
  lang: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: <K1 extends keyof TranslationKeys, K2 extends keyof TranslationKeys[K1]>(
    category: K1,
    key: K2
  ) => string;
}

const STORAGE_KEY = 'onboardcheck_lang';

function getInitialLang(): SupportedLanguage {
  const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
  if (saved && (saved === 'ru' || saved === 'en' || saved === 'kg')) {
    return saved;
  }
  return 'ru';
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: getInitialLang(),
  setLanguage: (lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    set({ lang });
  },
  t: (category, key) => {
    const currentLang = get().lang;
    const localeObj = LOCALES[currentLang] ?? LOCALES.ru;
    const catObj = localeObj[category];
    if (catObj && key in catObj) {
      return catObj[key] as unknown as string;
    }
    // Fallback to RU
    return (LOCALES.ru[category]?.[key] as unknown as string) ?? String(key);
  },
}));

export function useTranslation() {
  const { lang, setLanguage, t } = useI18nStore();
  return { lang, setLanguage, t };
}
