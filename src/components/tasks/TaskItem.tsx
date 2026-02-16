import { Task } from "@/types";

export default function TaskItem({ task, onToggle }: {
  task: Task;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />
      <span>{task.title}</span>
    </div>
  );
}
