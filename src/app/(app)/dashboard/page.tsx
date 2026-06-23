import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardWrapper from "@/components/dashboard/DashboardWrapper";

export const metadata = {
  title: "Dashboard",
};


export default async function Home() {
  const session = await getServerSession(authOptions);

  return <DashboardWrapper session={session} />;
}
