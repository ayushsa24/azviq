"use client";

export default function Header({ title }: { title?: string }) {
  return (
    <header className="flex items-center justify-between border-b p-4">
      <h1 className="text-xl font-semibold">{title ?? "Ascend AI"}</h1>
    </header>
  );
}
