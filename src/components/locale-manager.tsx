"use client";

import { useEffect } from 'react';
import { useTranslations } from '@/hooks/use-translations';

/**
 * Manages HTML lang attribute for better browser translation support
 *
 * Dual Translation Support:
 * 1. Our custom i18n (🌐 button) - Professional, selective translation
 * 2. Browser translation (Chrome/Edge) - Users can enable if they want
 *
 * Both work together!
 */
export function LocaleManager() {
  const { locale, mounted } = useTranslations();

  useEffect(() => {
    if (!mounted) return;

    // Update HTML lang attribute based on selected language
    // This helps browser translation understand the page language
    // and offer correct translation suggestions
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  return null; // This component doesn't render anything
}
