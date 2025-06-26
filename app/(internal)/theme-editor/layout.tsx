'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarNav } from './components/sidebar-nav';

const sidebarNavSections = [
  {
    items: [
      { title: 'Overview', href: '/theme-editor' },
      { title: 'Theme', href: '/theme-editor/theme' },
      { title: 'Icons', href: '/theme-editor/icons' },
    ]
  },
  {
    label: 'Actions',
    items: [
      { title: 'Button', href: '/theme-editor/components/button' },
      { title: 'Toggle', href: '/theme-editor/components/toggle' },
      { title: 'Toggle Group', href: '/theme-editor/components/toggle-group' },
    ]
  },
  {
    label: 'Form',
    items: [
      { title: 'Input', href: '/theme-editor/components/input' },
      { title: 'Textarea', href: '/theme-editor/components/textarea' },
      { title: 'Select', href: '/theme-editor/components/select' },
      { title: 'Checkbox', href: '/theme-editor/components/checkbox' },
      { title: 'Radio Group', href: '/theme-editor/components/radio-group' },
      { title: 'Switch', href: '/theme-editor/components/switch' },
      { title: 'Slider', href: '/theme-editor/components/slider' },
      { title: 'Date Picker', href: '/theme-editor/components/date-picker' },
    ]
  },
  {
    label: 'Layout',
    items: [
      { title: 'Card', href: '/theme-editor/components/card' },
      { title: 'Separator', href: '/theme-editor/components/separator' },
      { title: 'Tabs', href: '/theme-editor/components/tabs' },
      { title: 'Accordion', href: '/theme-editor/components/accordion' },
      { title: 'Table', href: '/theme-editor/components/table' },
    ]
  },
  {
    label: 'Display',
    items: [
      { title: 'Badge', href: '/theme-editor/components/badge' },
      { title: 'Avatar', href: '/theme-editor/components/avatar' },
      { title: 'Progress', href: '/theme-editor/components/progress' },
      { title: 'Alert', href: '/theme-editor/components/alert' },
    ]
  },
  {
    label: 'Interactive',
    items: [
      { title: 'Dialog', href: '/theme-editor/components/dialog' },
      { title: 'Sheet', href: '/theme-editor/components/sheet' },
      { title: 'Command', href: '/theme-editor/components/command' },
    ]
  }
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
          <SidebarNav sections={sidebarNavSections} />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-h-screen overflow-auto bg-white" data-main-content>
        {children}
      </div>
    </div>
  );
} 