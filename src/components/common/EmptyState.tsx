export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border rounded p-4">
      <div className="font-medium">{title}</div>
      {description ? <div className="text-sm opacity-80">{description}</div> : null}
    </div>
  );
}
