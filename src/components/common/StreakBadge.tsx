export default function StreakBadge({ streak }: { streak: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">
      Streak: {streak}
    </span>
  );
}
