"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 border-r p-4">
      <nav className="flex flex-col gap-2">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/notes">Notes</Link>
        <Link href="/tasks">Tasks</Link>
        <Link href="/progress">Progress</Link>
        <Link href="/settings">Settings</Link>
      </nav>
    </aside>
  );
}
