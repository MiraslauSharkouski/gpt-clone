'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfileProps {
  email?: string | null;
  isAnonymous?: boolean;
  usageCount?: number;
  remainingMessages?: number;
  onUpgrade?: () => void;
  onSignOut?: () => void;
}

export function UserProfile({
  email,
  isAnonymous,
  usageCount,
  remainingMessages,
  onUpgrade,
  onSignOut,
}: UserProfileProps) {
  return (
    <div className="border-t p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          {isAnonymous ? (
            <User className="h-5 w-5" />
          ) : (
            email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {isAnonymous ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Anonymous User</span>
              {remainingMessages !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({remainingMessages} messages left)
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm font-medium truncate">{email}</div>
          )}
          {isAnonymous && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Verify email for unlimited messages
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {isAnonymous && onUpgrade && (
          <Button
            onClick={onUpgrade}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Verify Email
          </Button>
        )}
        {onSignOut && (
          <Button
            onClick={onSignOut}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isAnonymous ? 'Clear' : 'Sign Out'}
          </Button>
        )}
      </div>
    </div>
  );
}
