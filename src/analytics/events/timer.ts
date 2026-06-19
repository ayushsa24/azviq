import { getPostHog } from '../posthog';

export const timerEvents = {
  sessionStarted(props: { duration_minutes: number; mode: 'focus' | 'break' }) {
    getPostHog().capture('timer_session_started', props);
  },

  sessionCompleted(props: { duration_minutes: number; mode: 'focus' | 'break' }) {
    getPostHog().capture('timer_session_completed', props);
  },

  sessionAborted(props: { elapsed_minutes: number }) {
    getPostHog().capture('timer_session_aborted', props);
  },
};
