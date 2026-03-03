import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SummarizeBox from "@/components/SummarizeBox";
import AskAIGlobalBar from "@/components/dashboard/AskAIGlobalBar";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] p-4 sm:p-6 lg:p-8 overflow-hidden transition-colors">
      <div className="flex flex-col mb-5">
        <h1 className="text-3xl font-extrabold text-[#252525] dark:text-[#CFCFCF] tracking-tight transition-colors">
          Dashboard
        </h1>
        <p className="text-[#545454] dark:text-[#7D7D7D] mt-1 transition-colors">
          Welcome back, {session?.user?.email || "Guest"}
        </p>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col gap-6 overflow-y-auto min-h-0 pt-4">
        <div className="bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-6 shadow-sm transition-colors">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Ascend AI 🚀
          </h2>
          <AskAIGlobalBar />
        </div>

        {/* Placeholder for more dashboard widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-3xl border-2 border-dashed border-[#CFCFCF] dark:border-[#545454] bg-[#F5F5F5] dark:bg-[#252525]/30 flex items-center justify-center">
            <p className="text-sm opacity-50">Activity Stats Coming Soon</p>
          </div>
          <div className="h-32 rounded-3xl border-2 border-dashed border-[#CFCFCF] dark:border-[#545454] bg-[#F5F5F5] dark:bg-[#252525]/30 flex items-center justify-center">
            <p className="text-sm opacity-50">Recent Files Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
