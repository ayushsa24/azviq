import type { Task } from "@/types";

export function createTask(title: string): Task {
  return {
    id: Date.now().toString(),
    title,
    completed: false,
  };
}
