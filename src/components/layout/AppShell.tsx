import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AmbientField } from './AmbientField';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { CommandPalette } from '@/components/quickadd/CommandPalette';
import { ToastProvider } from '@/components/ui/Toast';
import { ShortcutsOverlay } from '@/components/ui/ShortcutsOverlay';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="app-shell">
        <AmbientField />
        <Sidebar />
        <main className="main-content">{children}</main>
        <BottomNav />
        <ChatDrawer />
        <CommandPalette />
        <ShortcutsOverlay />
      </div>
    </ToastProvider>
  );
}
