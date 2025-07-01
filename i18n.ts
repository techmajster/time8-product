import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from '@/lib/i18n-utils';

// Our supported locales
export const locales = ['pl', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'pl';

export default getRequestConfig(async () => {
  // Use default locale for static generation
  // Components will handle dynamic locale switching at runtime
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
} 