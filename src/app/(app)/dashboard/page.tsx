import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardWrapper from "@/components/dashboard/DashboardWrapper";

export const metadata = {
  title: "Dashboard",
};


export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <DashboardWrapper session={session} />;
}
