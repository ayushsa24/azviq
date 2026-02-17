"use client";

import type { Task } from "@/types";

export default function TasksList({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: string) => void }) {
  if (!tasks.length) return null;

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <label key={task.id} className="flex items-center gap-2">
          <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} />
          <span>{task.title}</span>
        </label>
      ))}
    </div>
  );
}
