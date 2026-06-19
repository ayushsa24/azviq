import { getPostHog } from '../posthog';

export const tasksEvents = {
  taskCreated(props: { has_due_date: boolean; project_id: string | null }) {
    getPostHog().capture('tasks_task_created', props);
  },

  taskCompleted(props: { project_id: string | null }) {
    getPostHog().capture('tasks_task_completed', props);
  },

  taskDeleted() {
    getPostHog().capture('tasks_task_deleted');
  },

  projectCreated() {
    getPostHog().capture('tasks_project_created');
  },

  projectDeleted() {
    getPostHog().capture('tasks_project_deleted');
  },

  aiTaskGenerated(props: { task_count: number }) {
    getPostHog().capture('tasks_ai_generated', props);
  },
};
