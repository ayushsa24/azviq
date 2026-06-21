"use client";
import Navbar from "./landingpage/Navbar";
import Footer from "./landingpage/Footer";
import { Brain, Target, Shield, Zap, Sparkles, Globe } from "lucide-react";

export default function AboutPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#1D1D1F] selection:bg-[#E84B1B]/20 selection:text-[#E84B1B] overflow-x-hidden">
      <Navbar isLoggedIn={isLoggedIn} />

      {/* Hero Section */}
      <section className="pt-[160px] md:pt-[200px] pb-20 px-6 bg-[#F4F4F6]/50 border-b border-black/[0.05]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E84B1B]/10 text-[#E84B1B] text-[12px] font-bold tracking-wide uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Our Story
          </div>
          <h1 className="text-[40px] md:text-[64px] font-extrabold tracking-tight text-[#1D1D1F] leading-[1.1] mb-6">
            Redefining how the world <br className="hidden md:block" />
            <span className="text-[#E84B1B]">learns and studies.</span>
          </h1>
          <p className="text-[16px] md:text-[20px] text-[#6E6E73] font-medium leading-relaxed max-w-2xl mx-auto">
            Azviq was born from a simple belief: studying shouldn't be a disorganized, overwhelming process. We are building the ultimate AI-powered ecosystem to give every student a personalized, intelligent companion.
          </p>
        </div>
      </section>

      {/* The Problem & Solution Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div>
              <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[#1D1D1F] mb-6 leading-tight">
                The modern student is <br className="hidden md:block" /> overwhelmed by noise.
              </h2>
              <p className="text-[15px] text-[#6E6E73] leading-relaxed mb-6">
                Between scattered PDFs, messy notebooks, dozens of browser tabs, and generic AI tools that don't actually understand the curriculum, students are spending more time organizing than actually learning.
              </p>
              <p className="text-[15px] text-[#6E6E73] leading-relaxed">
                We realized that what students needed wasn't just another note-taking app. They needed a unified workspace where their materials instantly transform into interactive, contextual learning experiences.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square bg-[#F4F4F6] rounded-[40px] overflow-hidden border border-black/[0.05] p-8 relative flex flex-col items-center justify-center text-center">
                <Brain className="w-20 h-20 text-[#E84B1B] mb-6 opacity-80" />
                <h3 className="text-[24px] font-bold text-[#1D1D1F] mb-3">The Azviq Solution</h3>
                <p className="text-[14px] text-[#6E6E73] font-medium leading-relaxed max-w-[280px]">
                  A deeply integrated AI Teacher that reads your exact documents, understands your syllabus, and guides you through the toughest concepts—all in one distraction-free interface.
                </p>
                {/* Decorative gradients */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#E84B1B]/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-24 px-6 bg-[#1D1D1F] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[32px] md:text-[48px] font-bold tracking-tight mb-4">
              Our Core Principles
            </h2>
            <p className="text-[#88888F] text-[16px] max-w-xl mx-auto">
              Everything we build at Azviq is heavily scrutinized against these three foundational pillars.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Value 1 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-[#E84B1B]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Hyper-Personalized</h3>
              <p className="text-[14px] text-[#88888F] leading-relaxed">
                We don't believe in one-size-fits-all education. Our AI adapts to your specific reading speed, knowledge gaps, and the exact materials you upload.
              </p>
            </div>

            {/* Value 2 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-[#10B981]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Privacy & Focus First</h3>
              <p className="text-[14px] text-[#88888F] leading-relaxed">
                Your study materials belong to you. We protect your data with strict encryption, and our UI is deliberately designed to eliminate distractions and dopamine loops.
              </p>
            </div>

            {/* Value 3 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-[#3B82F6]" />
              </div>
              <h3 className="text-[20px] font-bold mb-3">Frictionless Workflow</h3>
              <p className="text-[14px] text-[#88888F] leading-relaxed">
                You shouldn't have to fight your tools. From seamless PDF imports to auto-generating tasks, every interaction in Azviq is engineered for maximum speed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Technology Section */}
      <section className="py-24 px-6 bg-white border-b border-black/[0.05]">
        <div className="max-w-5xl mx-auto text-center">
          <Globe className="w-12 h-12 text-[#1D1D1F] mx-auto mb-6 opacity-20" />
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[#1D1D1F] mb-6">
            Powered by next-gen technology.
          </h2>
          <p className="text-[16px] text-[#6E6E73] leading-relaxed max-w-3xl mx-auto mb-12">
            Under the hood, Azviq utilizes state-of-the-art Large Language Models (LLMs) and Vector Databases. 
            When you upload a textbook, we don't just store it—we semantically parse it. This means when you ask your AI Teacher a question, it instantly retrieves the exact paragraph from page 243 of your PDF to give you an incredibly accurate, hallucination-free answer.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="px-6 py-3 rounded-full border border-black/[0.08] text-[13px] font-bold text-[#1D1D1F] bg-[#F4F4F6]/50">
              Semantic Search
            </div>
            <div className="px-6 py-3 rounded-full border border-black/[0.08] text-[13px] font-bold text-[#1D1D1F] bg-[#F4F4F6]/50">
              Contextual AI Chat
            </div>
            <div className="px-6 py-3 rounded-full border border-black/[0.08] text-[13px] font-bold text-[#1D1D1F] bg-[#F4F4F6]/50">
              End-to-End Encryption
            </div>
            <div className="px-6 py-3 rounded-full border border-black/[0.08] text-[13px] font-bold text-[#1D1D1F] bg-[#F4F4F6]/50">
              Real-time Sync
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#F4F4F6]/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[#1D1D1F] mb-6">
            Join us in building the future of learning.
          </h2>
          <p className="text-[15px] text-[#6E6E73] mb-8 font-medium">
            Whether you're a high school student preparing for finals or a medical student tackling residency, Azviq is built for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#1D1D1F] text-white font-bold text-[14px] hover:bg-[#333336] transition-colors shadow-lg flex items-center justify-center gap-2">
              Start Studying Free
            </a>
            <a href="/contact" className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-[#1D1D1F] border border-black/[0.08] font-bold text-[14px] hover:bg-[#F4F4F6] transition-colors flex items-center justify-center gap-2">
              Contact the Team
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
