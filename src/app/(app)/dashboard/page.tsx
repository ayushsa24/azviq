import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardWrapper from "@/components/dashboard/DashboardWrapper";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // @ts-ignore
  if (!session.user?.is_onboarded) {
    redirect("/onboarding");
  }

  return <DashboardWrapper session={session} />;
}
