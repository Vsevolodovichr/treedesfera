import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BottomActionBarProps {
  children: ReactNode;
  className?: string;
}

export function BottomActionBar({ children, className }: BottomActionBarProps) {
  return (
    <div className={cn('sticky bottom-0 z-30 mt-6 bg-gradient-to-t from-[#0a070d] via-[#0a070d]/90 to-transparent p-4 pt-8', className)}>
      {children}
    </div>
  );
}
