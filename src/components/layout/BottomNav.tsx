"use client";

import Link from "next/link";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white p-3">
      <div className="mx-auto flex max-w-xl justify-between">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/notes">Notes</Link>
        <Link href="/tasks">Tasks</Link>
        <Link href="/settings">Settings</Link>
      </div>
    </nav>
  );
}
