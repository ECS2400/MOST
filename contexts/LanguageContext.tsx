
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { Language, LANGUAGES, getTranslations } from '@/constants/i18n';
import { EN } from '@/constants/i18n/en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: typeof EN;
  languages: typeof LANGUAGES;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'most_language';

const SUPPORTED: Language[] = ['pl', 'en', 'it', 'es', 'de', 'fr'];

/**
 * Detect best language from device locale.
 * Priority: exact match → language prefix match → 'pl' default
 */
function detectDeviceLanguage(): Language {
  const locales = Localization.getLocales();
  const tag = locales[0]?.languageCode?.toLowerCase();
  if (tag && SUPPORTED.includes(tag as Language)) {
    return tag as Language;
  }
  const prefix = tag?.split('-')[0];
  if (prefix && SUPPORTED.includes(prefix as Language)) {
    return prefix as Language;
  }
  return 'pl';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pl');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  async function loadLanguage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored as Language)) {
        // User previously chose a language — honour it
        setLanguageState(stored as Language);
      } else {
        // First run: detect from device locale
        const detected = detectDeviceLanguage();
        setLanguageState(detected);
      }
    } catch {
      const detected = detectDeviceLanguage();
      setLanguageState(detected);
    }
    setReady(true);
  }

  async function setLanguage(lang: Language) {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }

  const t = getTranslations(language);

  // Don't render children until language is determined (avoids flash of wrong language)
  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}
