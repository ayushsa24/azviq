"use client";

import React from "react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] p-4 sm:p-6 lg:p-8 overflow-hidden transition-colors">
      <div className="flex flex-col mb-5">
        <h1 className="text-3xl font-extrabold text-[#252525] dark:text-[#CFCFCF] tracking-tight transition-colors">
          Settings
        </h1>
        <p className="text-[#545454] dark:text-[#7D7D7D] mt-1 transition-colors">
          Manage your account preferences and application settings
        </p>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
        {/* Settings content will go here */}
        <div className="p-8 rounded-2xl border border-dashed border-[#CFCFCF] dark:border-[#545454] bg-[#F5F5F5] dark:bg-[#252525]/30">
          <p className="text-sm text-[#545454] dark:text-[#7D7D7D]">Settings configurations coming soon...</p>
        </div>
      </div>
    </div>
  );
}
