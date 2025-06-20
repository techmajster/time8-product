'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { type Locale } from '@/lib/i18n-utils';

const languages = [
  { code: 'pl' as Locale, name: 'Polski', flag: '🇵🇱' },
  { code: 'en' as Locale, name: 'English', flag: '🇬🇧' },
];

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    startTransition(async () => {
      try {
        // Set cookie for immediate locale change
        const response = await fetch('/api/locale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: newLocale }),
        });

        if (response.ok) {
          // Reload the page to apply the new locale
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to switch language:', error);
      }
    });

    setIsOpen(false);
  };

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="w-auto h-8 px-2"
        >
          <Languages className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
          <span className="sm:hidden">
            {currentLanguage?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => switchLanguage(language.code)}
            disabled={isPending || language.code === locale}
            className="cursor-pointer"
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
            {language.code === locale && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 