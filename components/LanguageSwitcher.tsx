'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, ChevronDown } from 'lucide-react';
import { type Locale } from '@/lib/i18n-utils';
import { toast } from 'sonner';

const languages = [
  { 
    code: 'pl' as Locale, 
    name: 'Polski', 
    flag: '🇵🇱',
    englishName: 'Polish'
  },
  { 
    code: 'en' as Locale, 
    name: 'English', 
    flag: '🇬🇧',
    englishName: 'English'
  },
];

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    setIsOpen(false);

    startTransition(async () => {
      try {
        console.log(`Switching language from ${locale} to ${newLocale}`);
        
        const response = await fetch('/api/locale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: newLocale }),
        });

        console.log('Locale API response:', response.status, response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('Response data:', data);
          
          const languageName = languages.find(l => l.code === newLocale)?.name;
          toast.success(`Language changed to ${languageName}`);
          
          // Force a full page reload to apply the new locale
          window.location.reload();
        } else {
          const errorData = await response.json();
          console.error('Language switch failed:', errorData);
          toast.error('Failed to change language');
        }
      } catch (error) {
        console.error('Failed to switch language:', error);
        toast.error('Failed to change language');
      }
    });
  };

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="gap-2 h-8"
        >
          <span className="text-base">{currentLanguage?.flag}</span>
          <span className="hidden sm:inline text-sm font-medium">
            {currentLanguage?.name}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48 z-[9999]">
        {languages.map((language, index) => (
          <div key={language.code}>
            <DropdownMenuItem
              onClick={() => switchLanguage(language.code)}
              disabled={isPending}
              className="cursor-pointer gap-2 px-2 py-1.5"
            >
              <span className="text-base">{language.flag}</span>
              <span className="text-sm font-medium">{language.name}</span>
              {language.code === locale && (
                <span className="ml-auto text-xs opacity-60">✓</span>
              )}
            </DropdownMenuItem>
            {index < languages.length - 1 && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 