import { getPostHog } from '../posthog';

export const aiEvents = {
  messageSent(props: {
    model: string;
    has_image: boolean;
    message_length: number;
    is_temp_chat: boolean;
  }) {
    getPostHog().capture('ai_message_sent', props);
  },

  chatCreated() {
    getPostHog().capture('ai_chat_created');
  },

  chatDeleted() {
    getPostHog().capture('ai_chat_deleted');
  },

  chatShared() {
    getPostHog().capture('ai_chat_shared');
  },

  chatPinned() {
    getPostHog().capture('ai_chat_pinned');
  },

  chatArchived() {
    getPostHog().capture('ai_chat_archived');
  },

  feedbackGiven(props: { sentiment: 'good' | 'bad' }) {
    getPostHog().capture('ai_message_feedback', props);
  },

  voiceDictationUsed() {
    getPostHog().capture('ai_voice_dictation_used');
  },

  imageAttached() {
    getPostHog().capture('ai_image_attached');
  },

  quotaReached(props: { quota_type: 'chat' | 'vision' | 'exercise' | 'note_ai' | 'personal_ai' }) {
    getPostHog().capture('ai_quota_reached', props);
  },

  upgradePromptShown(props: { trigger: string }) {
    getPostHog().capture('ai_upgrade_prompt_shown', props);
  },

  pdfImported() {
    getPostHog().capture('ai_pdf_imported');
  },
};
