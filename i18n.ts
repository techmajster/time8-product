import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from '@/lib/i18n-utils';

// Our supported locales
export const locales = ['pl', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pl';

export default getRequestConfig(async () => {
  // Get the user's preferred locale using our hierarchy
  let locale: Locale;
  
  try {
    locale = await getUserLocale();
  } catch (error) {
    console.error('Error getting user locale:', error);
    locale = defaultLocale;
  }

  // Validate locale
  if (!locales.includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
} 