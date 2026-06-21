/**
 * PostHog Client — Azviq Analytics
 *
 * Direct import (confirmed working). Zero console noise in production.
 * Dev events are opt-out controlled via NEXT_PUBLIC_POSTHOG_ENABLE_DEV.
 */

import posthog from 'posthog-js';

let _initialized = false;

/** Initialise PostHog once. Safe to call multiple times. */
export function initPostHog(): void {
  if (typeof window === 'undefined') return; // SSR guard
  if (_initialized) return;                   // Already initialised

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.includes('REPLACE')) return; // Key not set

  const enableDev = process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV === 'true';

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    ui_host: 'https://us.posthog.com',

    // ─── Pageview / Autocapture ────────────────────────────────────────────
    capture_pageview: false,  // We fire $pageview manually (SPA-safe)
    capture_pageleave: true,  // Free engagement signal — keep on
    autocapture: false,       // Explicit events only — no magic clicks

    // ─── Session Recording ─────────────────────────────────────────────────
    session_recording: {
      maskAllInputs: true,    // PII safety — masks all form fields
    },

    // ─── Persistence ──────────────────────────────────────────────────────
    persistence: 'localStorage+cookie',

    // ─── Dev guard ─────────────────────────────────────────────────────────
    // Set NEXT_PUBLIC_POSTHOG_ENABLE_DEV=true in .env.local to track locally.
    // Leave unset (default) to avoid polluting production data with dev clicks.
    loaded: (ph) => {
      const consent = typeof window !== 'undefined' ? localStorage.getItem('azviq-cookie-consent') : null;
      const enableDev = process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV === 'true';
      if (process.env.NODE_ENV !== 'production' && !enableDev) {
        ph.opt_out_capturing();
      } else if (consent === 'declined') {
        ph.opt_out_capturing();
      }
    },
  });

  _initialized = true;
}

/** Returns the PostHog instance. Returns a no-op proxy on SSR or before init. */
export function getPostHog() {
  if (typeof window !== 'undefined' && _initialized) return posthog;

  // Silent no-op — never crashes the app if PostHog isn't ready
  return new Proxy({} as typeof posthog, {
    get: () => () => {},
  });
}

