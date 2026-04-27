-- Migration to add missing indexes for foreign keys
CREATE INDEX idx_notes_original_note_id ON public.notes (original_note_id);
CREATE INDEX idx_parent_control_user_id ON public.parent_control (user_id);
CREATE INDEX idx_personal_ai_sessions_note_id ON public.personal_ai_sessions (note_id);
CREATE INDEX idx_personal_ai_sessions_user_id ON public.personal_ai_sessions (user_id);
CREATE INDEX idx_shared_chats_chat_id ON public.shared_chats (chat_id);
CREATE INDEX idx_shared_chats_user_id ON public.shared_chats (user_id);
CREATE INDEX idx_trash_user_id ON public.trash (user_id);
