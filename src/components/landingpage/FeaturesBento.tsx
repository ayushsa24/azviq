"use client";
import Link from "next/link";
import { Home, Library, MessageSquare, CheckSquare, Sparkles, Shield, Users } from "lucide-react";

export default function FeaturesBento() {
  const features = [
    {
      id: "dashboard",
      title: "Dashboard",
      description: "See everything at a glance. Study time, due tasks, revision schedule, and your consistency heatmap.",
      link: "/features/dashboard",
      icon: <Home className="w-6 h-6 text-indigo-600" strokeWidth={2} />,
    },
    {
      id: "ai-chat",
      title: "AI Chat",
      description: "Chat with an AI that understands your note pages, files, and lectures to help you study smarter.",
      link: "/features/ai-chat",
      icon: <MessageSquare className="w-6 h-6 text-purple-600" strokeWidth={2} />,
    },
    {
      id: "library",
      title: "Library",
      description: "Store notes, PDFs, external workspaces and study materials — completely organized and searchable.",
      link: "/features/library",
      icon: <Library className="w-6 h-6 text-emerald-600" strokeWidth={2} />,
    },
    {
      id: "tasks",
      title: "Project & Tasks",
      description: "Sleek Kanban boards for your active projects. Track progress from Not Started to Done easily.",
      link: "/features/tasks",
      icon: <CheckSquare className="w-6 h-6 text-rose-600" strokeWidth={2} />,
    },
    {
      id: "prep",
      title: "Preparation",
      description: "AI-generated exercises, flashcards, active recall reviews, and an AI Study Teacher.",
      link: "/features/prep",
      icon: <Sparkles className="w-6 h-6 text-amber-600" strokeWidth={2} />,
    },
    {
      id: "privacy",
      title: "Permanent Storage Erasure",
      description: "Total control over your data. Permanently delete anything you want, anytime, with zero recovery.",
      link: "/features/data-privacy",
      icon: <Shield className="w-6 h-6 text-[#1D1D1F]" strokeWidth={2} />,
    },
    {
      id: "parental",
      title: "Family Members & Daily Reports",
      description: "Keep family in the loop with automated daily study reports and progress tracking.",
      link: "/features/parental-control",
      icon: <Users className="w-6 h-6 text-[#E84B1B]" strokeWidth={2} />,
    }
  ];

  return (
    <section id="features" className="py-24 px-6 bg-white border-t border-black/[0.05]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-[#E84B1B] uppercase tracking-[0.15em] mb-4 font-bold">
            Everything you need
          </p>
          <h2 className="text-[36px] md:text-[44px] font-bold text-[#1D1D1F] mb-4 tracking-tight leading-tight">
            Explore Features
          </h2>
          <p className="text-[#6E6E73] text-base md:text-lg max-w-[580px] mx-auto leading-relaxed font-medium">
            Everything from AI-powered tools to complete data privacy.
          </p>
        </div>

        {/* SIMPLE EQUAL SIZE CARD GRID WITH ICONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link 
              href={feature.link} 
              key={feature.id}
              className="group flex flex-col bg-[#F4F4F6]/50 border border-black/[0.05] rounded-3xl p-8 hover:bg-white hover:border-black/15 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer min-h-[220px]"
            >
              <div className="flex-grow">
                <div className="mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-3">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-[#6E6E73] leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
              <div className="mt-6 flex items-center text-[#1D1D1F] font-bold text-sm">
                <span>Explore</span>
                <span className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
