import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type Locale = 'pl' | 'en';

export const locales: Locale[] = ['pl', 'en'];
export const defaultLocale: Locale = 'pl';

/**
 * Get user's locale preference with fallback hierarchy:
 * 1. Cookie value
 * 2. User settings from database
 * 3. Organization default locale
 * 4. System default (Polish)
 */
export async function getUserLocale(): Promise<Locale> {
  // 1. Check cookie first (most immediate preference)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaultLocale;

    // 2. Check user settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('locale')
      .eq('user_id', user.id)
      .single();

    if (userSettings?.locale && locales.includes(userSettings.locale as Locale)) {
      return userSettings.locale as Locale;
    }

    // 3. Check organization default (via user profile)
    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        organization_id,
        organizations!inner(default_locale)
      `)
      .eq('id', user.id)
      .single();

    if (profile?.organizations && typeof profile.organizations === 'object' && 'default_locale' in profile.organizations) {
      const orgLocale = (profile.organizations as any).default_locale;
      if (orgLocale && locales.includes(orgLocale as Locale)) {
        return orgLocale as Locale;
      }
    }
  } catch (error) {
    console.error('Error getting user locale:', error);
  }

  // 4. Final fallback
  return defaultLocale;
}

/**
 * Set user's locale preference in both cookie and database
 */
export async function setUserLocale(locale: Locale): Promise<{ success: boolean; error?: string }> {
  if (!locales.includes(locale)) {
    return { success: false, error: 'Invalid locale' };
  }

  try {
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('locale', locale, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    // Update database
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user_settings exists
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingSettings) {
        // Update existing
        await supabase
          .from('user_settings')
          .update({ locale, language: locale })
          .eq('user_id', user.id);
      } else {
        // Create new
        await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            locale,
            language: locale,
          });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting user locale:', error);
    return { success: false, error: 'Failed to save locale preference' };
  }
}

/**
 * Get supported locales
 */
export function getSupportedLocales(): readonly Locale[] {
  return locales;
}

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale display name
 */
export function getLocaleDisplayName(locale: Locale): string {
  const displayNames: Record<Locale, string> = {
    pl: 'Polski',
    en: 'English',
  };
  return displayNames[locale];
}

/**
 * Get locale flag emoji
 */
export function getLocaleFlag(locale: Locale): string {
  const flags: Record<Locale, string> = {
    pl: '🇵🇱',
    en: '🇬🇧',
  };
  return flags[locale];
}

/**
 * Get locale from request headers (for middleware)
 */
export function getLocaleFromHeaders(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return defaultLocale;
  
  const preferredLocales = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim().toLowerCase())
    .map(lang => lang.split('-')[0]); // Convert 'pl-PL' to 'pl'
  
  for (const preferred of preferredLocales) {
    if (locales.includes(preferred as Locale)) {
      return preferred as Locale;
    }
  }
  
  return defaultLocale;
} 