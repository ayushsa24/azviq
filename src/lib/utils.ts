export function getAvatarColor(name: string | null | undefined): string {
  const colors = [
    "#EF4444", // red-500
    "#F97316", // orange-500
    "#F59E0B", // amber-500
    "#10B981", // emerald-500
    "#14B8A6", // teal-500
    "#0EA5E9", // sky-500
    "#6366F1", // indigo-500
    "#8B5CF6", // violet-500
    "#D946EF", // fuchsia-500
    "#EC4899", // pink-500
    "#F43F5E", // rose-500
    "#C2A27A", // azviq gold/tan
  ];
  
  if (!name) return "#C2A27A";
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
