import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import SummarizeBox from "@/components/SummarizeBox";
import AskAIGlobalBar from "@/components/dashboard/AskAIGlobalBar";

export default async function Home() {
  const session = await getServerSession();

  // Temporarily comment out authentication check for testing
  // if (!session) {
  //   redirect("/login");
  // }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Ascend AI 🚀
      </h1>

      <p className="mb-4">
        Welcome {session?.user?.email || "Guest"}
      </p>

      <AskAIGlobalBar />

    </main>
  );
}
