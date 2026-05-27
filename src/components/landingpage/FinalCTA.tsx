"use client";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-32 px-6 border-t border-black/[0.06] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.01) 0%, transparent 70%)" }} />
      <div className="relative max-w-xl mx-auto text-center">
        <p className="text-[12px] text-[#6E6E73] uppercase tracking-[0.12em] mb-6 font-semibold">Get started today</p>
        <h2 className="text-[48px] font-bold text-[#1D1D1F] mb-4 leading-tight">Stop studying harder.<br />Start studying smarter.</h2>
        <p className="text-[#6E6E73] text-base mb-10">Join Azviq for free. No credit card required.</p>
        <Link href="/signup" className="inline-flex items-center gap-2 bg-black text-white font-semibold px-9 py-4 rounded-full text-base hover:bg-black/90 transition-all hover:scale-105">
          Get Started Free →
        </Link>
        <p className="text-[#88888F] text-[13px] mt-5 font-medium">Free forever · AI-powered · Built for students</p>
      </div>
    </section>
  );
}
