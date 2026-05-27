"use client";
import Link from "next/link";

export default function AIChatSection() {
  return (
    <section className="py-20 px-6 border-t border-black/[0.06]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs text-[#22C55E] uppercase tracking-[0.1em] mb-4 font-semibold">AI Study Assistant</p>
          <h2 className="text-[32px] font-bold text-[#1D1D1F] mb-5 leading-tight">Your personal AI tutor, available 24/7</h2>
          <p className="text-[#6E6E73] text-base leading-relaxed mb-8">Ask anything about your studies. Azviq AI understands context, explains concepts clearly, and helps you when you're stuck — just like a real tutor.</p>
          <ul className="space-y-3 mb-8">
            {["Ask questions in plain language", "Get explanations tailored to your notes", "Upload images and get instant answers"].map(b => (
              <li key={b} className="flex items-center gap-3 text-sm text-[#6E6E73]">
                <span className="text-[#22C55E] font-bold">✓</span>{b}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="text-sm text-[#1D1D1F] font-semibold hover:underline">Try AI Chat →</Link>
        </div>
        <div className="relative bg-white border border-black/[0.06] rounded-2xl p-6 shadow-lg">
          <p className="text-[#6E6E73] text-sm mb-5 font-semibold">How can I help you study?</p>
          <div className="space-y-3 mb-5">
            <div className="bg-black/[0.03] rounded-xl px-4 py-3 text-sm text-[#1D1D1F] ml-8">Explain the Krebs cycle in simple terms</div>
            <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-xl px-4 py-3 text-sm text-[#1D1D1F] mr-8">
              The Krebs cycle (citric acid cycle) is a series of chemical reactions your cells use to generate energy from acetyl-CoA. Here's a simple breakdown: <span className="text-[#3B82F6] font-medium">...</span>
            </div>
          </div>
          <div className="bg-[#F8F8FA] border border-black/[0.04] rounded-xl px-4 py-2.5 text-sm text-[#88888F]">Ask anything...</div>
        </div>
      </div>
    </section>
  );
}
