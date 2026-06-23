import { getPostHog } from './posthog';

export interface AzviqUser {
  id: string;
  email?: string | null;
  name?: string | null;
  plan_tier?: 0 | 1 | 2;
  created_at?: string;
}

const PLAN_NAMES: Record<number, string> = {
  0: 'free',
  1: 'lite',
  2: 'premium',
};

export function identifyUser(user: AzviqUser) {
  const ph = getPostHog();

  ph.identify(user.id, {
    email: user.email ?? null,
    name: user.name ?? null,
    // Safe properties only
    plan_tier: PLAN_NAMES[user.plan_tier ?? 0],
    is_premium: user.plan_tier === 2,
    is_paid: (user.plan_tier ?? 0) > 0,
    signup_date: user.created_at ?? null,
  });
}

/**
 * Call on logout — clears distinct_id and session data.
 */
export function resetUser() {
  getPostHog().reset();
}

/**
 * Update a single user property at runtime (e.g., after an upgrade).
 * Uses posthog-js v2 API — setPersonProperties()
 */
export function setUserProperty(key: string, value: string | number | boolean) {
  getPostHog().capture('$set', { $set: { [key]: value } });
}
