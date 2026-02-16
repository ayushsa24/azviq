"use client";
import { useState } from "react";

export default function SummarizeBox() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  async function summarize() {
    const res = await fetch("/api/ai", {
      method: "POST",
      body: JSON.stringify({ text: input }),
    });

    const data = await res.json();
    setResult(data.summary);
  }

  return (
    <>
      <textarea
        className="border p-2 w-full"
        rows={5}
        placeholder="Paste study text..."
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={summarize}
        className="bg-blue-600 text-white px-4 py-2 mt-3 rounded"
      >
        Summarize
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          {result}
        </div>
      )}
    </>
  );
}
