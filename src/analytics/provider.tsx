'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { initPostHog, getPostHog } from './posthog';
import { identifyUser, resetUser } from './identify';

// ─── Inner component — uses useSearchParams (requires Suspense boundary) ───
function PostHogInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams(); // ← must be inside <Suspense>
  const prevPath = useRef<string>('');

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    if (url === prevPath.current) return;
    prevPath.current = url;

    const t = setTimeout(() => {
      getPostHog().capture('$pageview', { $current_url: window.location.href });
    }, 100);

    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  return null;
}

// ─── Auth tracker — separate so it doesn't need Suspense ──────────────────
function PostHogAuthSync() {
  const { data: session, status } = useSession();
  const identified = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user && !identified.current) {
      identifyUser(session.user as Parameters<typeof identifyUser>[0]);
      identified.current = true;
    }
    if (status === 'unauthenticated' && identified.current) {
      resetUser();
      identified.current = false;
    }
  }, [status, session]);

  return null;
}

// ─── Main provider — mount once in root layout ────────────────────────────
export function PostHogProvider({ children }: { children: React.ReactNode }) {

  // Init PostHog lazily after hydration (dynamic import = no bundle impact)
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <>
      {/* Suspense required by Next.js for useSearchParams() */}
      <Suspense fallback={null}>
        <PostHogInner />
      </Suspense>
      <PostHogAuthSync />
      {children}
    </>
  );
}
