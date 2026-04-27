-- Recreates 5 foreign key covering indexes that were incorrectly dropped
-- in the previous unused index cleanup session.
CREATE INDEX idx_projects_user_id ON public.projects (user_id);
CREATE INDEX idx_workspaces_user_id ON public.workspaces (user_id);
CREATE INDEX idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX idx_tasks_project_id ON public.tasks (project_id);
CREATE INDEX idx_exercise_results_exercise_id ON public.exercise_results (exercise_id);
