'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarNavItem {
  title: string;
  href: string;
}

interface SidebarNavSection {
  label?: string;
  items: SidebarNavItem[];
}

interface SidebarNavProps {
  sections: SidebarNavSection[];
}

export function SidebarNav({ sections }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="px-3 py-2 space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex}>
          {section.label && (
            <div className="px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.label}
              </h3>
            </div>
          )}
          <div className="space-y-1">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
