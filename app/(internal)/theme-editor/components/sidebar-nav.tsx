'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  items: {
    title: string;
    href: string;
  }[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="px-3 py-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
            pathname === item.href
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
} 