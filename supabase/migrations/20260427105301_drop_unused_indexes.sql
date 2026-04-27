-- Migration to drop unused indexes for performance
DROP INDEX IF EXISTS public.idx_ev_expires;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_workspaces_user_id;
DROP INDEX IF EXISTS public.idx_exercise_results_user_id;
DROP INDEX IF EXISTS public.idx_exercise_results_exercise_id;
DROP INDEX IF EXISTS public.idx_projects_user_id;
DROP INDEX IF EXISTS public.idx_tasks_project_id;
DROP INDEX IF EXISTS public.idx_tasks_user_id;
DROP INDEX IF EXISTS public.idx_notes_is_public;
DROP INDEX IF EXISTS public.idx_otp_email_type;
DROP INDEX IF EXISTS public.idx_otp_expires_at;
