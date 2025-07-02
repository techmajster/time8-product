import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Our supported locales
export const locales = ['pl', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pl';

// Import messages statically to avoid dynamic import issues
import plMessages from './messages/pl.json';
import enMessages from './messages/en.json';

const messages = {
  pl: plMessages,
  en: enMessages,
};

// Safe cookie-only locale detection to avoid OAuth interference
async function getSafeLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('locale')?.value as Locale;
    
    if (cookieLocale && locales.includes(cookieLocale)) {
      return cookieLocale;
    }
  } catch (error) {
    // If cookies fail (e.g., during build), use default
    console.log('Cookie locale detection failed, using default:', error);
  }
  
  return defaultLocale;
}

export default getRequestConfig(async () => {
  // Use safe cookie-only locale detection
  const locale = await getSafeLocale();

  return {
    locale,
    messages: messages[locale]
  };
});

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
} 