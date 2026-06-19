import { getPostHog } from '../posthog';

export const studyEvents = {
  /** Fired by useStudyTracker when a session ends */
  sessionLogged(props: {
    activity_type: 'note' | 'pdf' | 'exercise' | 'revision' | 'ai_teacher' | 'personal_ai';
    duration_minutes: number;
    subject?: string;
    topic?: string;
  }) {
    getPostHog().capture('study_session_logged', props);
  },

  streakAchieved(props: { streak_days: number }) {
    getPostHog().capture('study_streak_achieved', props);
  },

  streakBroken(props: { streak_days: number }) {
    getPostHog().capture('study_streak_broken', props);
  },

  exerciseCompleted(props: { score: number; subject?: string }) {
    getPostHog().capture('study_exercise_completed', props);
  },

  revisionCompleted(props: { subject?: string }) {
    getPostHog().capture('study_revision_completed', props);
  },
};
