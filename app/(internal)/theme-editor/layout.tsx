'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav } from './components/sidebar-nav';

const sidebarNavItems = [
  { title: 'Overview', href: '/theme-editor' },
  { title: 'Theme', href: '/theme-editor/theme' },
  { title: 'Icons', href: '/theme-editor/icons' },
];

export default function ThemeEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Scroll to top when route changes
  useEffect(() => {
    const scrollToTop = () => {
      // Try multiple scroll reset methods
      const mainContent = document.querySelector('[data-main-content]');
      if (mainContent) {
        mainContent.scrollTop = 0;
        mainContent.scrollTo({ top: 0, behavior: 'instant' });
      }
      
      // Also reset window scroll
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    // Immediate scroll reset
    scrollToTop();
    
    // Additional reset after content renders
    setTimeout(scrollToTop, 0);
    setTimeout(scrollToTop, 10);
    setTimeout(scrollToTop, 50);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50/50 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Design System</h2>
          <p className="text-sm text-gray-600 mt-1">Internal Tool</p>
        </div>
        <div className="flex-1">
          <SidebarNav items={sidebarNavItems} />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-h-screen overflow-auto bg-white" data-main-content>
        {children}
      </div>
    </div>
  );
} 