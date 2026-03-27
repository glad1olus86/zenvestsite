'use client';

import { Menu, Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="h-16 border-b border-white/10 bg-surface/50 backdrop-blur-xl flex items-center justify-between px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <Menu size={24} />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-4">
        <button className="relative text-muted hover:text-foreground transition-colors cursor-pointer">
          <Bell size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold">
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-muted leading-tight">{session?.user?.role || 'manager'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
