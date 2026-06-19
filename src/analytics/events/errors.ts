import { getPostHog } from '../posthog';

export const errorEvents = {
  /**
   * Track meaningful API errors.
   * Strips PII from message before sending.
   */
  apiFailed(props: {
    endpoint: string;
    status: number;
    module: string;
  }) {
    getPostHog().capture('error_api_failed', {
      // Strip UUIDs from endpoint strings
      endpoint: props.endpoint.replace(/\/[a-f0-9-]{8,}/g, '/:id'),
      status: props.status,
      module: props.module,
    });
  },

  quotaExceeded(props: { quota_type: string; plan_tier: string }) {
    getPostHog().capture('error_quota_exceeded', props);
  },
};
