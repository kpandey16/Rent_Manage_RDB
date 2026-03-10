"use client";

import { useState, useEffect } from 'react';
import { Locale, defaultLocale } from '@/i18n/config';
import enMessages from '../../messages/en.json';
import hiMessages from '../../messages/hi.json';

type Messages = typeof enMessages;

const messages: Record<Locale, Messages> = {
  en: enMessages,
  hi: hiMessages,
};

export function useTranslations() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved locale from localStorage
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'hi')) {
      setLocaleState(savedLocale);
    }
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages[locale];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return { t, locale, setLocale, mounted };
}
