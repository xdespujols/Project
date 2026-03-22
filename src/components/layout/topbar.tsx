'use client';

import { signOut } from 'next-auth/react';
import { Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  userName?: string | null;
};

export function Topbar({ userName }: Props) {
  return (
    <header className="h-14 border-b bg-white flex items-center px-4 gap-4">
      <div className="flex-1" />
      <Button variant="ghost" size="icon">
        <Bell className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <User className="h-4 w-4" />
        {userName}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        <LogOut className="h-4 w-4 mr-1" />
        Sign out
      </Button>
    </header>
  );
}
