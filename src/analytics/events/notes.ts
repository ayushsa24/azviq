import { getPostHog } from '../posthog';

export const notesEvents = {
  noteCreated(props: { workspace_id: string; has_content: boolean }) {
    getPostHog().capture('notes_note_created', props);
  },

  noteDeleted() {
    getPostHog().capture('notes_note_deleted');
  },

  noteMoved() {
    getPostHog().capture('notes_note_moved');
  },

  noteRenamed() {
    getPostHog().capture('notes_note_renamed');
  },

  noteShared() {
    getPostHog().capture('notes_note_shared');
  },

  pdfUploaded(props: { file_size_mb: number }) {
    getPostHog().capture('notes_pdf_uploaded', props);
  },

  pdfUploadFailed(props: { reason: string }) {
    getPostHog().capture('notes_pdf_upload_failed', { reason: props.reason });
  },

  workspaceCreated() {
    getPostHog().capture('notes_workspace_created');
  },

  workspaceDeleted() {
    getPostHog().capture('notes_workspace_deleted');
  },

  aiSummarizeUsed() {
    getPostHog().capture('notes_ai_summarize_used');
  },

  noteTrashed() {
    getPostHog().capture('notes_note_trashed');
  },

  noteRestored() {
    getPostHog().capture('notes_note_restored');
  },
};
