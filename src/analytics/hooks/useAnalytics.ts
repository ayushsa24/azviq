'use client';

import { useCallback } from 'react';
import { getPostHog } from '../posthog';

type Properties = Record<string, string | number | boolean | null | undefined>;

/**
 * useAnalytics — the ONLY hook you need to fire events from any component.
 *
 * Usage:
 *   const { capture } = useAnalytics();
 *   capture('notes_note_created', { workspace_id: ws.id });
 */
export function useAnalytics() {
  const capture = useCallback((event: string, props?: Properties) => {
    try {
      getPostHog().capture(event, props);
    } catch {
      // Analytics must NEVER crash the app
    }
  }, []);

  return { capture };
}
