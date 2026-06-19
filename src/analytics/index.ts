// Analytics barrel — import everything from here
export { initPostHog, getPostHog } from './posthog';
export { identifyUser, resetUser, setUserProperty } from './identify';
export { PostHogProvider } from './provider';
export { useAnalytics } from './hooks/useAnalytics';

// Event namespaces
export { authEvents } from './events/auth';
export { aiEvents } from './events/ai';
export { notesEvents } from './events/notes';
export { tasksEvents } from './events/tasks';
export { timerEvents } from './events/timer';
export { studyEvents } from './events/study';
export { subscriptionEvents } from './events/subscription';
export { errorEvents } from './events/errors';
