import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BackgroundLayer } from './BackgroundLayer';
import { MobileBar } from './MobileBar';

interface AppLayoutProps {
  title: string;
  description?: string;
  backTo?: string;
  children: ReactNode;
}

export function AppLayout({ title, description, backTo, children }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden bg-[#0a070d] font-sans text-[#f5f5f5]">
      <BackgroundLayer />
      <div className="relative z-10 flex h-dvh w-full max-w-[480px] flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        <div className="grid min-h-[72px] shrink-0 grid-cols-[44px_1fr] items-start gap-3 px-4 pb-2 pt-3">
          {backTo ? (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-black/30 text-[#f5f0fa] backdrop-blur-sm active:scale-95"
              aria-label="Назад"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <div />
          )}
          <div className="min-w-0 pt-0.5 text-right">
            <h1 className="truncate text-[20px] font-semibold leading-6 text-[#f5f0fa]">{title}</h1>
            {description ? <p className="mt-1 text-[13px] leading-5 text-[#a08fb0]">{description}</p> : null}
          </div>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
        <MobileBar />
      </div>
    </div>
  );
}
