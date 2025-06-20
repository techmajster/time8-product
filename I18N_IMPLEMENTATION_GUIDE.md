# 🌍 Internationalization Implementation Guide
*SaaS Leave Management System*

## Overview
Implement next-intl with Polish as primary language, English as secondary. Cookie/header-based detection without URL changes.

## 🎯 Strategy
- **Primary**: Polish (pl) - existing business logic
- **Secondary**: English (en) - with Polish legal terms in parentheses
- **Detection**: Cookies + database preferences
- **Routing**: No URL prefix (`/dashboard` stays `/dashboard`)

## 📦 Installation

```bash
npm install next-intl @formatjs/intl-localematcher negotiator
npm install -D @types/negotiator
```

## 🗄️ Database Updates

```sql
-- Organizations table
ALTER TABLE organizations 
ADD COLUMN default_locale VARCHAR(10) DEFAULT 'pl',
ADD COLUMN supported_locales TEXT[] DEFAULT ARRAY['pl', 'en'];

-- User settings locale support
ALTER TABLE user_settings 
ADD COLUMN language VARCHAR(10) DEFAULT 'pl';

-- Holiday descriptions
ALTER TABLE holidays 
ADD COLUMN descriptions JSONB DEFAULT '{}';

-- Update existing holidays
UPDATE holidays 
SET descriptions = jsonb_build_object('pl', COALESCE(description, name), 'en', name)
WHERE descriptions = '{}' OR descriptions IS NULL;
```

## 📁 File Structure

```
├── i18n.ts                    # next-intl config
├── middleware.ts              # Locale detection
├── messages/
│   ├── pl.json               # Polish (primary)
│   └── en.json               # English
├── lib/
│   └── locale.ts             # Locale utilities
└── components/
    └── language-switcher.tsx  # UI component
```

## 🔧 Core Configuration

### `i18n.ts`
```typescript
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

export const locales = ['pl', 'en'] as const;
export type Locale = typeof locales[number];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();
  
  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

### `middleware.ts`
```typescript
import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['pl', 'en'],
  defaultLocale: 'pl',
  localePrefix: 'never' // No URL changes
});

export async function middleware(request: NextRequest) {
  const authResponse = await updateSession(request);
  if (authResponse.status !== 200) return authResponse;
  
  const intlResponse = intlMiddleware(request);
  if (intlResponse) {
    authResponse.cookies.getAll().forEach(cookie => {
      intlResponse.cookies.set(cookie.name, cookie.value);
    });
    return intlResponse;
  }
  
  return authResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

### `next.config.ts`
```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
};

export default withNextIntl(nextConfig);
```

## 📝 Translation Files

### `messages/pl.json` (Primary)
```json
{
  "navigation": {
    "dashboard": "Pulpit",
    "leave": "Urlopy",
    "calendar": "Kalendarz",
    "team": "Zespół",
    "schedule": "Harmonogram",
    "settings": "Ustawienia"
  },
  "leave": {
    "types": {
      "annual": "Urlop wypoczynkowy",
      "sick": "Zwolnienie lekarskie",
      "special": "Urlop okolicznościowy"
    },
    "status": {
      "pending": "Oczekujący",
      "approved": "Zatwierdzony",
      "rejected": "Odrzucony"
    }
  },
  "legal": {
    "advance_notice": "Wymagane wyprzedzenie: {days} dni",
    "annual_entitlement": "Roczne wymiary urlopu: 20-26 dni"
  }
}
```

### `messages/en.json` (Secondary)
```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "leave": "Leave",
    "calendar": "Calendar",
    "team": "Team",
    "schedule": "Schedule",
    "settings": "Settings"
  },
  "leave": {
    "types": {
      "annual": "Annual Leave (Urlop wypoczynkowy)",
      "sick": "Sick Leave (Zwolnienie lekarskie)",
      "special": "Special Leave (Urlop okolicznościowy)"
    },
    "status": {
      "pending": "Pending",
      "approved": "Approved",
      "rejected": "Rejected"
    }
  },
  "legal": {
    "advance_notice": "Required advance notice: {days} days",
    "annual_entitlement": "Annual entitlement: 20-26 days"
  }
}
```

## 🛠️ Utilities

### `lib/locale.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type Locale = 'pl' | 'en';
export const defaultLocale: Locale = 'pl';
export const locales: Locale[] = ['pl', 'en'];

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  
  // Check cookie
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // Check user settings
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', user.id)
        .single();

      if (data?.language && locales.includes(data.language as Locale)) {
        return data.language as Locale;
      }
    }
  } catch (error) {
    console.error('Error getting user locale:', error);
  }

  return defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale);
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, language: locale }, { onConflict: 'user_id' });
    }
  } catch (error) {
    console.error('Error setting user locale:', error);
  }
}
```

## 🎛️ Language Switcher

### `components/language-switcher.tsx`
```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { setUserLocale, type Locale } from '@/lib/locale';

const languages = {
  pl: { name: 'Polski', flag: '🇵🇱' },
  en: { name: 'English', flag: '🇬🇧' }
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(async () => {
      await setUserLocale(newLocale);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <Globe className="h-4 w-4 mr-2" />
          {languages[locale].flag} {languages[locale].name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languages).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLocaleChange(code as Locale)}
            className={locale === code ? 'bg-accent' : ''}
          >
            {lang.flag} {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 🔄 Component Updates

### Example: Navigation Component
```typescript
import { useTranslations } from 'next-intl';

export function Navigation() {
  const t = useTranslations('navigation');
  
  return (
    <nav>
      <Link href="/dashboard">{t('dashboard')}</Link>
      <Link href="/leave">{t('leave')}</Link>
      <Link href="/calendar">{t('calendar')}</Link>
    </nav>
  );
}
```

### Example: Leave Form
```typescript
import { useTranslations } from 'next-intl';

export function LeaveRequestForm() {
  const t = useTranslations('leave');
  
  return (
    <form>
      <select>
        <option value="annual">{t('types.annual')}</option>
        <option value="sick">{t('types.sick')}</option>
      </select>
    </form>
  );
}
```

## 📧 Email Localization

### Update Email Templates
```typescript
import { getTranslations } from 'next-intl/server';

export async function generateLeaveNotificationEmail(data: any, locale: string = 'pl') {
  const t = await getTranslations('email', { locale });
  
  return {
    subject: t('leave_notification.subject', { type: data.leaveType }),
    html: `<h1>${t('leave_notification.title')}</h1>`
  };
}
```

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] Install dependencies
- [ ] Create configuration files
- [ ] Run database migrations
- [ ] Set up translation files

### Phase 2: Core Components  
- [ ] Update root layout
- [ ] Add language switcher
- [ ] Convert navigation
- [ ] Update main forms

### Phase 3: Complete Conversion
- [ ] Convert all components to use translations
- [ ] Update email templates
- [ ] Add date/number formatting
- [ ] Test all functionality

### Phase 4: Polish & Test
- [ ] Complete translation review
- [ ] Performance testing
- [ ] RLS policy verification
- [ ] User acceptance testing

## 🔐 Security Notes

- All RLS policies remain unchanged
- New database columns have appropriate defaults
- Locale validation prevents injection
- Translation content is properly escaped

## 🎯 Key Benefits

- ✅ No URL changes - users stay on same paths
- ✅ Polish remains primary with full legal terms
- ✅ English includes Polish legal terms for clarity
- ✅ Organization and user-level preferences
- ✅ Database-backed with cookie fallback
- ✅ Type-safe translations
- ✅ Maintains existing functionality

---

*Ready to implement? Start with Phase 1 and work through systematically!* 