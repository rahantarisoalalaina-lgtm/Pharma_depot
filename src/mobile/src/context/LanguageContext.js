// src/context/LanguageContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../i18n/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('fr');

  React.useEffect(() => {
    AsyncStorage.getItem('app_lang').then(saved => {
      if (saved === 'fr' || saved === 'mg') setLang(saved);
    }).catch(() => {});
  }, []);

  const switchLang = useCallback(async (code) => {
    setLang(code);
    try { await AsyncStorage.setItem('app_lang', code); } catch {}
  }, []);

  const t = useCallback((key) => {
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['fr']?.[key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}