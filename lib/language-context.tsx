import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { translations, detectSystemLanguage, isValidLanguage, Language, TranslationKey } from './i18n';

const LANG_STORAGE_KEY = 'dbp_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getStoredLanguage(): Language | null {
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored && isValidLanguage(stored)) return stored;
    } catch {}
  }
  return null;
}

function storeLanguage(lang: Language) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {}
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = getStoredLanguage();
    return stored || detectSystemLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    storeLanguage(lang);
    if (typeof supabase !== 'undefined' && supabase.auth?.getSession) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          supabase.from('profiles').update({ language }).eq('id', session.user.id).then(() => {});
        }
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && mounted) {
        supabase
          .from('profiles')
          .select('language, email')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (!data || !mounted) return;
            const email = (data as any).email as string;
            supabase
              .from('locked_languages')
              .select('language')
              .eq('email', email.toLowerCase())
              .maybeSingle()
              .then(({ data: locked }) => {
                if (locked?.language && mounted) {
                  const lang = locked.language as Language;
                  if (isValidLanguage(lang)) {
                    setLanguageState(lang);
                    storeLanguage(lang);
                  }
                  return;
                }
                if (data.language && mounted) {
                  const lang = data.language as string;
                  if (isValidLanguage(lang)) {
                    setLanguageState(lang as Language);
                    storeLanguage(lang as Language);
                  }
                }
              });
          });
      }
    });
    return () => { mounted = false; };
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
