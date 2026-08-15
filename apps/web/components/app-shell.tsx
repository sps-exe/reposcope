'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SiteHeader, HeaderAnalyzeSelector } from '@repo/site-shell';
import { cn } from '@/lib/utils';
import config from '@/site.config';
import { RealtimeSummary } from '@/components/RealtimeSummary';

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const pageBackground = isHome ? '#12151f' : '#0b0e14';

  useEffect(() => {
    document.documentElement.style.backgroundColor = pageBackground;
    document.body.style.backgroundColor = pageBackground;
  }, [pageBackground]);

  const navigateTo = useCallback((url: string) => {
    router.push(url);
  }, [router]);

  return (
    <div
      className={cn(
        'min-h-screen text-foreground',
        isHome ? 'bg-[#12151f]' : 'bg-[#0b0e14]',
      )}
    >
      <SiteHeader
        {...config.header}
        className={cn(
          'border-b-0 shadow-none',
          isHome ? 'bg-[#12151f]' : 'bg-[#0b0e14]',
        )}
        style={{ backgroundColor: pageBackground }}
        searchSlot={<HeaderAnalyzeSelector navigateTo={navigateTo} />}
      >
        <RealtimeSummary />
      </SiteHeader>
      {children}
    </div>
  );
}
