import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AskAIGlobalBar from "@/components/dashboard/AskAIGlobalBar";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import GreetingHeader from "@/components/dashboard/GreetingHeader";
import RecentItemsScroll from "@/components/dashboard/RecentItemsScroll";
import DashboardTasks from "@/components/dashboard/DashboardTasks";
import DashboardChecklist from "@/components/dashboard/DashboardChecklist";
import DashboardStats from "@/components/dashboard/DashboardStats";
import StudyConsistency from "@/components/dashboard/StudyConsistency";
import AiSuggestions from "@/components/dashboard/AiSuggestions";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Extract the first name from user session
  const userFullName = session?.user?.name || "";
  const email = session?.user?.email || "";
  let userName = "Guest";

  if (userFullName) {
    userName = userFullName.split(' ')[0];
  } else if (email) {
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

          {/* New Stats Row */}
          <div className="mb-3 sm:mb-4">
            <DashboardStats />
          </div>

          {/* 3. Recent Items (Horizontal Scroll) */}
          <div className="mb-3 sm:mb-4">
            <RecentItemsScroll />
          </div>

          {/* 4. To-Do List & Tasks (2 Column Grid on Laptop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-stretch mb-3 sm:mb-4">
            <DashboardChecklist />
            <DashboardTasks />
          </div>

          {/* Mobile Layout: AI Suggestions BEFORE Study Consistency */}
          <div className="flex flex-col md:hidden gap-3 sm:gap-4">
            <AiSuggestions />
            <StudyConsistency />
          </div>

          {/* Desktop Layout: AI Suggestions AFTER Study Consistency */}
          <div className="hidden md:flex flex-col gap-3 sm:gap-4">
            <StudyConsistency />
            <AiSuggestions />
          </div>

        </div>
      </div>
    </div>
  );
}
