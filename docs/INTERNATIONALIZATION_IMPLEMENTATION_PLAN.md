# 🌍 Internationalization Implementation Plan
*SaaS Leave Management System*

## 📋 Overview

This document outlines the complete implementation plan for adding internationalization (i18n) to the leave management system using **next-intl** with Polish as the primary language and English as secondary.

## 🎯 Strategy

### Language Approach
- **Primary Language**: Polish (pl) - maintains existing business logic and legal terms
- **Secondary Language**: English (en) - for international expansion
- **Legal Terms**: Keep Polish labor law terms in Polish, translate descriptions
- **Database**: Use existing holiday system with locale-aware descriptions

### Implementation Method
- **Library**: next-intl (most compatible with Next.js 14 App Router)
- **Routing**: Cookie/header-based detection (no URL changes)
- **Fallback**: Polish for missing translations
- **Type Safety**: Full TypeScript integration

## 🗂️ Database Schema Updates

### 1. Organization Table Enhancement

```sql
-- Add locale columns to organizations table
ALTER TABLE organizations 
ADD COLUMN default_locale VARCHAR(10) DEFAULT 'pl',
ADD COLUMN supported_locales TEXT[] DEFAULT ARRAY['pl', 'en'];

-- Add comment
COMMENT ON COLUMN organizations.default_locale IS 'Default language for organization';
COMMENT ON COLUMN organizations.supported_locales IS 'Array of supported locale codes';
```

### 2. User Settings Table Enhancement

The `user_settings` table needs locale support:

```sql
-- Ensure user_settings table exists with locale support
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  leave_request_reminders BOOLEAN DEFAULT true,
  team_leave_notifications BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
  language VARCHAR(10) DEFAULT 'pl',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies if not exists
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();
```

### 3. Holiday Descriptions Enhancement

```sql
-- Add locale-aware descriptions to holidays
ALTER TABLE holidays 
ADD COLUMN descriptions JSONB DEFAULT '{}',
ADD COLUMN locale VARCHAR(10) DEFAULT 'pl';

-- Update existing holidays with Polish descriptions
UPDATE holidays 
SET descriptions = jsonb_build_object('pl', COALESCE(description, name), 'en', name)
WHERE descriptions = '{}' OR descriptions IS NULL;

-- Add comment
COMMENT ON COLUMN holidays.descriptions IS 'JSON object with locale-specific descriptions {pl: "Polish desc", en: "English desc"}';
```

## 📦 Dependencies Installation

```bash
# Install next-intl and required dependencies
npm install next-intl
npm install @formatjs/intl-localematcher negotiator
npm install @types/negotiator --save-dev
```

## 🗂️ Project Structure

```
├── app/
│   ├── [locale]/           # Locale-aware routes (optional for sub-path routing)
│   ├── globals.css
│   ├── layout.tsx          # Root layout with locale detection
│   └── page.tsx            # Home page
├── messages/               # Translation files
│   ├── pl.json            # Polish translations (primary)
│   ├── en.json            # English translations
│   └── index.ts           # Translation utilities
├── lib/
│   ├── i18n.ts            # i18n configuration
│   ├── locale.ts          # Locale detection utilities
│   └── translations.ts    # Translation helpers
├── components/
│   ├── language-switcher.tsx  # Language switcher component
│   └── ui/
├── hooks/
│   └── use-locale.ts      # Locale management hook
├── middleware.ts          # Locale detection middleware
├── next.config.ts         # Next.js i18n configuration
└── i18n.ts                # next-intl configuration
```

## 🔧 Implementation Steps

### Step 1: Install Dependencies and Basic Setup

```bash
# Install next-intl
npm install next-intl @formatjs/intl-localematcher negotiator
npm install -D @types/negotiator
```

### Step 2: Create Configuration Files

#### `i18n.ts` (root level)
```typescript
import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['pl', 'en'] as const;
export type Locale = typeof locales[number];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale parameter is valid
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

#### `middleware.ts`
```typescript
import createMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['pl', 'en'],
  defaultLocale: 'pl',
  localeDetection: true,
  localePrefix: 'never' // No URL prefix, use cookies/headers
});

export async function middleware(request: NextRequest) {
  // First run auth middleware
  const response = await updateSession(request);
  
  // If auth middleware returned a redirect, return it
  if (response.status !== 200) {
    return response;
  }

  // Then run i18n middleware
  const intlResponse = intlMiddleware(request);
  
  // Merge the responses
  if (intlResponse) {
    // Copy cookies and headers from auth response to intl response
    response.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value);
    });
    return intlResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

#### `next.config.ts`
```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing config
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
};

export default withNextIntl(nextConfig);
```

### Step 3: Translation Files Structure

#### `messages/pl.json` (Primary Language)
```json
{
  "common": {
    "loading": "Ładowanie...",
    "save": "Zapisz",
    "cancel": "Anuluj",
    "delete": "Usuń",
    "edit": "Edytuj",
    "view": "Zobacz",
    "back": "Powrót",
    "next": "Dalej",
    "previous": "Poprzedni",
    "search": "Szukaj",
    "filter": "Filtruj",
    "export": "Eksportuj",
    "import": "Importuj",
    "refresh": "Odśwież"
  },
  "navigation": {
    "dashboard": "Pulpit",
    "leave": "Urlopy",
    "calendar": "Kalendarz",
    "team": "Zespół",
    "schedule": "Harmonogram",
    "settings": "Ustawienia",
    "profile": "Profil",
    "admin": "Administracja"
  },
  "leave": {
    "types": {
      "annual": "Urlop wypoczynkowy",
      "sick": "Zwolnienie lekarskie",
      "special": "Urlop okolicznościowy",
      "unpaid": "Urlop bezpłatny",
      "parental": "Urlop rodzicielski",
      "care": "Urlop opiekuńczy",
      "force_majeure": "Urlop siły wyższej",
      "on_demand": "Urlop na żądanie"
    },
    "status": {
      "pending": "Oczekujący",
      "approved": "Zatwierdzony",
      "rejected": "Odrzucony",
      "cancelled": "Anulowany"
    },
    "form": {
      "leave_type": "Typ urlopu",
      "start_date": "Data rozpoczęcia",
      "end_date": "Data zakończenia",
      "reason": "Powód",
      "days_count": "Liczba dni",
      "submit": "Złóż wniosek",
      "working_days": "dni roboczych",
      "remaining_balance": "Pozostało: {days} dni"
    }
  },
  "legal": {
    "polish_labor_law": "Zgodnie z Kodeksem Pracy",
    "advance_notice": "Wymagane wyprzedzenie: {days} dni",
    "annual_entitlement": "Roczne wymiary urlopu wypoczynkowego",
    "seniority_under_10": "Pracownicy ze stażem poniżej 10 lat: 20 dni",
    "seniority_over_10": "Pracownicy ze stażem powyżej 10 lat: 26 dni",
    "on_demand_limit": "Urlop na żądanie: maksymalnie 4 dni rocznie"
  },
  "holidays": {
    "national": "Święto państwowe",
    "organization": "Święto firmowe",
    "setup_title": "Konfiguracja systemu świąt",
    "polish_holidays": "Polskie święta państwowe",
    "calendar_selection": "Wybór kalendarza świąt"
  }
}
```

#### `messages/en.json` (Secondary Language)
```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "view": "View",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import",
    "refresh": "Refresh"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "leave": "Leave",
    "calendar": "Calendar",
    "team": "Team",
    "schedule": "Schedule",
    "settings": "Settings",
    "profile": "Profile",
    "admin": "Administration"
  },
  "leave": {
    "types": {
      "annual": "Annual Leave (Urlop wypoczynkowy)",
      "sick": "Sick Leave (Zwolnienie lekarskie)",
      "special": "Special Leave (Urlop okolicznościowy)",
      "unpaid": "Unpaid Leave (Urlop bezpłatny)",
      "parental": "Parental Leave (Urlop rodzicielski)",
      "care": "Care Leave (Urlop opiekuńczy)",
      "force_majeure": "Force Majeure Leave (Urlop siły wyższej)",
      "on_demand": "On-Demand Leave (Urlop na żądanie)"
    },
    "status": {
      "pending": "Pending",
      "approved": "Approved",
      "rejected": "Rejected",
      "cancelled": "Cancelled"
    },
    "form": {
      "leave_type": "Leave Type",
      "start_date": "Start Date",
      "end_date": "End Date",
      "reason": "Reason",
      "days_count": "Number of Days",
      "submit": "Submit Request",
      "working_days": "working days",
      "remaining_balance": "Remaining: {days} days"
    }
  },
  "legal": {
    "polish_labor_law": "According to Polish Labor Code",
    "advance_notice": "Required advance notice: {days} days",
    "annual_entitlement": "Annual Leave Entitlement",
    "seniority_under_10": "Employees with less than 10 years: 20 days",
    "seniority_over_10": "Employees with more than 10 years: 26 days",
    "on_demand_limit": "On-demand leave: maximum 4 days per year"
  },
  "holidays": {
    "national": "National Holiday",
    "organization": "Company Holiday",
    "setup_title": "Holiday System Configuration",
    "polish_holidays": "Polish National Holidays",
    "calendar_selection": "Holiday Calendar Selection"
  }
}
```

### Step 4: Utility Functions

#### `lib/locale.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type Locale = 'pl' | 'en';

export const defaultLocale: Locale = 'pl';
export const locales: Locale[] = ['pl', 'en'];

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  
  // 1. Check cookie first
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value as Locale;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // 2. Check user settings in database
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get user's personal preference
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', user.id)
        .single();

      if (userSettings?.language && locales.includes(userSettings.language as Locale)) {
        return userSettings.language as Locale;
      }

      // Get organization's default locale
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          organizations (
            default_locale
          )
        `)
        .eq('id', user.id)
        .single();

      const orgLocale = profile?.organizations?.default_locale as Locale;
      if (orgLocale && locales.includes(orgLocale)) {
        return orgLocale;
      }
    }
  } catch (error) {
    console.error('Error getting user locale:', error);
  }

  // 3. Fallback to default
  return defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale);
  
  // Also update in database if user is logged in
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          language: locale
        }, {
          onConflict: 'user_id'
        });
    }
  } catch (error) {
    console.error('Error setting user locale:', error);
  }
}
```

#### `components/language-switcher.tsx`
```typescript
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { setUserLocale, type Locale } from '@/lib/locale';

const languages = {
  pl: { name: 'Polski', flag: '🇵🇱' },
  en: { name: 'English', flag: '🇬🇧' }
};

export function LanguageSwitcher() {
  const t = useTranslations('common');
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

### Step 5: Root Layout Integration

#### `app/layout.tsx`
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getUserLocale } from '@/lib/locale';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema Zarządzania Urlopami',
  description: 'Profesjonalny system zarządzania urlopami dla organizacji',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getUserLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Step 6: Component Updates

#### Example: Leave Request Form
```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function LeaveRequestForm() {
  const t = useTranslations('leave');
  const tCommon = useTranslations('common');

  return (
    <form className="space-y-4">
      <div>
        <Label htmlFor="leave_type">{t('form.leave_type')} *</Label>
        {/* Form implementation */}
      </div>
      
      <div>
        <Label htmlFor="start_date">{t('form.start_date')} *</Label>
        {/* Date picker implementation */}
      </div>

      <Button type="submit">
        {t('form.submit')}
      </Button>
    </form>
  );
}
```

### Step 7: Server Component Integration

#### Example: Dashboard Page
```typescript
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('navigation');

  return (
    <div>
      <h1>{t('dashboard')}</h1>
      {/* Page content */}
    </div>
  );
}
```

## 🎨 UI/UX Considerations

### Language Switcher Placement
- **Navigation Bar**: Add language switcher to main navigation
- **User Profile Menu**: Include language preference in profile settings
- **Admin Settings**: Organization-level language defaults

### Date Formatting
```typescript
// lib/date-utils.ts
import { useLocale } from 'next-intl';

export function formatDate(date: Date): string {
  const locale = useLocale();
  
  return new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date);
}
```

### Number Formatting
```typescript
export function formatCurrency(amount: number): string {
  const locale = useLocale();
  
  return new Intl.NumberFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    style: 'currency',
    currency: locale === 'pl' ? 'PLN' : 'EUR'
  }).format(amount);
}
```

## 📧 Email Template Localization

### Update Email Templates
```typescript
// lib/email-templates.ts
import { getTranslations } from 'next-intl/server';

export async function generateLeaveNotificationEmail(
  data: LeaveNotificationData,
  locale: string = 'pl'
) {
  const t = await getTranslations('email', { locale });
  
  return {
    subject: t('leave_notification.subject', { type: data.leaveType }),
    html: `
      <h1>${t('leave_notification.title')}</h1>
      <p>${t('leave_notification.greeting')}</p>
      <p>${t('leave_notification.message', { 
        employeeName: data.employeeName,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate 
      })}</p>
    `
  };
}
```

## 🧪 Testing Strategy

### Translation Testing
```typescript
// tests/i18n.test.ts
import { describe, it, expect } from 'vitest';
import plMessages from '../messages/pl.json';
import enMessages from '../messages/en.json';

describe('Translation completeness', () => {
  it('should have all Polish keys in English', () => {
    const plKeys = flattenObject(plMessages);
    const enKeys = flattenObject(enMessages);
    
    Object.keys(plKeys).forEach(key => {
      expect(enKeys).toHaveProperty(key);
    });
  });
});
```

## 🚀 Migration Strategy

### Phase 1: Foundation (Week 1)
1. Install dependencies
2. Create basic configuration
3. Set up database schema updates
4. Create translation files structure

### Phase 2: Core Components (Week 2)
1. Update main navigation
2. Convert leave management forms
3. Update dashboard components
4. Add language switcher

### Phase 3: Advanced Features (Week 3)
1. Email template localization
2. Date/number formatting
3. Admin settings integration
4. Holiday system updates

### Phase 4: Testing & Polish (Week 4)
1. Comprehensive testing
2. Translation completeness check
3. Performance optimization
4. Documentation updates

## 🔒 Security Considerations

### RLS Policies
All database changes maintain existing Row Level Security policies. New columns are added safely without affecting current access patterns.

### Validation
```typescript
// Locale validation middleware
export function validateLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
```

### Sanitization
All translated content is properly escaped to prevent XSS attacks.

## 📊 Performance Optimization

### Bundle Splitting
```typescript
// Only load required translations
const dictionaries = {
  pl: () => import('./messages/pl.json').then((module) => module.default),
  en: () => import('./messages/en.json').then((module) => module.default),
};
```

### Caching Strategy
- Translation files cached at build time
- User locale preferences cached in cookies
- Database locale queries optimized with indexes

## 🎯 Success Metrics

### Completion Criteria
- ✅ All 200+ Polish strings translated
- ✅ Language switcher working in all contexts
- ✅ Organization and user locale preferences functional
- ✅ Email templates localized
- ✅ Legal terms properly handled
- ✅ No performance degradation
- ✅ All existing tests passing
- ✅ RLS policies maintained

### Quality Assurance
- Translation accuracy verified by native speakers
- UI/UX consistency across languages
- Performance benchmarks met
- Accessibility standards maintained

## 📚 Resources

### Documentation
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Guide](https://nextjs.org/docs/app/guides/internationalization)
- [Polish Labor Law Reference](https://www.gov.pl/web/rodzina/urlopy-pracownicze)

### Tools
- **Translation Management**: Consider Crowdin or Lokalise for larger scale
- **Testing**: Jest/Vitest for translation completeness
- **Performance**: Bundle analyzer for optimization

---

*This implementation plan ensures a smooth transition to a multilingual system while maintaining the existing Polish business logic and legal compliance.* 