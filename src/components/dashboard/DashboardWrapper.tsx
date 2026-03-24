"use client";

import { useUser } from "@/contexts/UserContext";
import GreetingHeader from "./GreetingHeader";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import AskAIGlobalBar from "./AskAIGlobalBar";
import DashboardStats from "./DashboardStats";
import RecentItemsScroll from "./RecentItemsScroll";
import DashboardChecklist from "./DashboardChecklist";
import DashboardTasks from "./DashboardTasks";
import AiSuggestions from "./AiSuggestions";
import StudyConsistency from "./StudyConsistency";
import { Session } from "next-auth";

export default function DashboardWrapper({ session }: { session: Session }) {
  const { user, isLoading } = useUser();
  
  if (isLoading) return null; // Or a skeleton

  // Extract first name: 
  // 1. Prioritize database full name from UserContext
  // 2. Fall back to session name
  // 3. Fall back to email prefix
  const userFullName = user?.name || session.user?.name || "";
  const email = session.user?.email || "";
  let userName = "Guest";

  if (userFullName && userFullName.trim() !== "") {
    userName = userFullName.split(' ')[0];
  } else if (email) {
    // If the email prefix is suspiciously short or generic, we can improve this,
    // but usually taking the first part of the email is the standard fallback.
    userName = email.split('@')[0];
  }

  return (
    <div className="flex flex-col h-full bg-transparent dark:bg-[#1A1A1A] text-[#252525] dark:text-white overflow-hidden transition-colors">
      <div className="flex-1 w-full overflow-y-auto min-h-0">
        <div className="w-full flex flex-col pt-1.5 sm:pt-4 lg:pt-6 px-3 sm:px-6">

          {/* 1. Greeting, Motivation, Date */}
          <GreetingHeader userName={userName}>
            <SidebarToggleButton />
          </GreetingHeader>

          {/* 2. Ask AI Prompt Bar */}
          <div className="mb-3 sm:mb-4">
            <AskAIGlobalBar />
          </div>

          {/* Stats Row */}
          <div className="mb-3 sm:mb-4">
            <DashboardStats />
          </div>

          {/* 3. Recent Items (Horizontal Scroll) */}
          <div className="mb-3 sm:mb-4">
            <RecentItemsScroll />
          </div>

          {/* 4. To-Do List & Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch mb-3 sm:mb-4">
            <DashboardChecklist />
            <DashboardTasks />
          </div>

          {/* AI Suggestions & Study Consistency */}
          <div className="flex flex-col md:hidden gap-3 sm:gap-4">
            <AiSuggestions />
            <StudyConsistency />
          </div>
          <div className="hidden md:flex flex-col gap-3 sm:gap-4">
            <StudyConsistency />
            <AiSuggestions />
          </div>

        </div>
      </div>
    </div>
  );
}
