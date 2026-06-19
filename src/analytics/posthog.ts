/**
 * PostHog Client — Azviq Analytics
 *
 * Uses dynamic import so posthog-js (~80KB) is loaded AFTER the page is
 * interactive. This means zero impact on LCP / FCP / TTI.
 */

let _posthog: typeof import('posthog-js').default | null = null;

/** Lazily initialise PostHog once. Safe to call multiple times. */
export async function initPostHog(): Promise<void> {
  if (typeof window === 'undefined') return; // SSR guard
  if (_posthog) return;                       // Already initialised

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    console.warn('[Analytics] NEXT_PUBLIC_POSTHOG_KEY is not set — PostHog disabled.');
    return;
  }

  const { default: posthog } = await import('posthog-js');

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',

    // ─── Pageview / Autocapture ────────────────────────────────────────────
    capture_pageview: false,   // We fire $pageview manually (SPA safe)
    capture_pageleave: true,   // Free engagement signal
    autocapture: false,        // NO magic clicks — explicit events only

    // ─── Session Recording ──────────────────────────────────────────────────
    session_recording: {
      maskAllInputs: true,     // PII safety — hides all form fields
    },

    // ─── Persistence ───────────────────────────────────────────────────────
    persistence: 'localStorage+cookie',

    // ─── Dev safety ────────────────────────────────────────────────────────
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') {
        ph.opt_out_capturing();  // No noise in dev/staging
      }
    },
  });

  _posthog = posthog;
}

/**
 * Returns the PostHog instance. Returns a no-op proxy if PostHog has not been
 * initialised yet so callers never need to null-check.
 */
export function getPostHog() {
  if (_posthog) return _posthog;

  // Silent no-op proxy — never crashes the app if PostHog isn't ready
  return new Proxy({} as typeof import('posthog-js').default, {
    get: () => () => {},
  });
}
