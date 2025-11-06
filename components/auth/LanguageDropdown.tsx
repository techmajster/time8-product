'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { type Locale } from '@/lib/i18n-utils';
import { toast } from 'sonner';
import { PolandFlag } from '@/components/icons/PolandFlag';
import { UKFlag } from '@/components/icons/UKFlag';

const languages = [
  {
    code: 'pl' as Locale,
    name: 'Polski',
    flagComponent: PolandFlag,
  },
  {
    code: 'en' as Locale,
    name: 'English',
    flagComponent: UKFlag,
  },
];

export function LanguageDropdown() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === locale) return;

    setIsOpen(false);

    startTransition(async () => {
      try {
        const response = await fetch('/api/locale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: newLocale }),
        });

        if (response.ok) {
          const languageName = languages.find(l => l.code === newLocale)?.name;
          toast.success(`Language changed to ${languageName}`);
          router.refresh();
        } else {
          toast.error('Failed to change language');
        }
      } catch (error) {
        console.error('Failed to switch language:', error);
        toast.error('Failed to change language');
      }
    });
  };

  const currentLanguage = languages.find(lang => lang.code === locale);
  const CurrentFlagComponent = currentLanguage?.flagComponent || PolandFlag;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isPending}
          className="absolute right-6 top-6 z-20 bg-card border border-border rounded-md px-3 py-2 flex items-center justify-center gap-2 hover:bg-accent transition-colors disabled:opacity-50"
        >
          <CurrentFlagComponent size={16} />
          <span className="text-xs font-medium text-foreground">
            {currentLanguage?.name}
          </span>
          <ChevronDown className="h-4 w-4 text-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-auto min-w-[120px] p-1">
        {languages.map((language) => {
          const FlagComponent = language.flagComponent;
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => switchLanguage(language.code)}
              disabled={isPending}
              className="cursor-pointer flex items-center gap-2 pl-2 pr-8 py-1.5 text-sm relative"
            >
              <FlagComponent size={16} />
              <span>{language.name}</span>
              {language.code === locale && (
                <span className="absolute right-2 text-xs opacity-60">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
