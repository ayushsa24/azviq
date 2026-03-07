"use client";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";

export default function ProgressPage() {
  return (
    <div className="flex flex-col h-full bg-transparent dark:bg-[#1A1A1A] text-[#252525] dark:text-white px-4 sm:px-6 lg:px-8 overflow-hidden transition-colors">
      <div className="flex items-center gap-3 pt-3 sm:pt-6 pb-3">
        <SidebarToggleButton />
        <div>
          <h1 className="text-[23px] sm:text-2xl font-extrabold text-[#252525] dark:text-white tracking-tight">Progress</h1>
          <p className="text-xs text-[#7D7D7D] dark:text-[#BABABA] mt-0.5">Track your learning progress</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 rounded-2xl border border-dashed border-[#CFCFCF] dark:border-[#545454] bg-[#F5F5F5] dark:bg-[#252525]/30">
          <p className="text-sm text-[#545454] dark:text-[#BABABA]">Progress tracking coming soon...</p>
        </div>
      </div>
    </div>
  );
}
