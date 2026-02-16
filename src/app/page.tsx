"use client";

import FocusTimer from "../components/timer/FocusTimer";
import Button from "../components/ui/Button";

export default function Home() {
  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">
        Ascend AI 🚀
      </h1>

      <FocusTimer />

      <div className="mt-6">
        <Button>+ Add Study Task</Button>
      </div>
    </main>
  );
}
