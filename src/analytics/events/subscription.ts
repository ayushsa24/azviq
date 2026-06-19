import { getPostHog } from '../posthog';
import { PostHog } from 'posthog-node';

// ── Client-side subscription events ─────────────────────────────────────────

export const subscriptionEvents = {
  upgradeInitiated(props: { from_tier: string; to_tier: string; trigger: string }) {
    getPostHog().capture('subscription_upgrade_initiated', props);
  },

  pricingModalOpened(props: { trigger: string }) {
    getPostHog().capture('subscription_pricing_modal_opened', props);
  },

  planSelected(props: { plan: string; billing: 'monthly' | 'annual' }) {
    getPostHog().capture('subscription_plan_selected', props);
  },
};

// ── Server-side subscription events (called from API routes / webhooks) ──────

let _serverPH: PostHog | null = null;

function getServerPH(): PostHog {
  if (!_serverPH) {
    _serverPH = new PostHog(process.env.POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,         // Flush immediately for webhooks
      flushInterval: 0,
    });
  }
  return _serverPH;
}

/**
 * Call from /api/webhook after a successful Razorpay payment.
 * Runs server-side — no risk of PII leaking to the browser.
 */
export async function trackPaymentSucceeded(
  userId: string,
  props: { plan: string; amount_inr: number }
) {
  const ph = getServerPH();
  ph.capture({
    distinctId: userId,
    event: 'subscription_payment_succeeded',
    properties: {
      plan: props.plan,
      amount_inr: props.amount_inr,
      // NEVER send card/UPI details
    },
  });
  await ph.shutdown();
}

export async function trackPaymentFailed(
  userId: string,
  props: { plan: string }
) {
  const ph = getServerPH();
  ph.capture({
    distinctId: userId,
    event: 'subscription_payment_failed',
    properties: { plan: props.plan },
  });
  await ph.shutdown();
}

export async function trackPlanExpired(userId: string, props: { plan: string }) {
  const ph = getServerPH();
  ph.capture({
    distinctId: userId,
    event: 'subscription_plan_expired',
    properties: { plan: props.plan },
  });
  await ph.shutdown();
}
