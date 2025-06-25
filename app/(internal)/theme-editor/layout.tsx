'use client';

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
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50/50">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Design System</h2>
          <p className="text-sm text-gray-600 mt-1">Internal Tool</p>
        </div>
        <SidebarNav items={sidebarNavItems} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
} 