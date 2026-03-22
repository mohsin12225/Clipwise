'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const NO_SIDEBAR_ROUTES = ['/'];
const FULL_WIDTH_ROUTES = ['/'];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Initialize theme (reads from localStorage, applies to DOM)
  useTheme();

  const isLandingPage = pathname === '/';
  const showSidebar =
    !NO_SIDEBAR_ROUTES.includes(pathname) &&
    !isLandingPage &&
    !pathname.startsWith('/editor/');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        {showSidebar && <Sidebar />}
        <div
          className={cn(
            'flex-1 flex flex-col',
            'min-h-[calc(100vh-4rem)]',
            'bg-surface-light-secondary dark:bg-surface-dark',
            'transition-colors duration-250'
          )}
        >
          {children}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}