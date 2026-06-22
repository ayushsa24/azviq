import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import HelpCenterPage from "@/components/HelpCenterPage";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Help Center",
  description: "Get support, read articles, and learn how to use Azviq to its fullest potential.",
};

export default async function HelpCenter() {
  // Help center disabled for now
  redirect("/");

  const session = await getServerSession(authOptions);

  return <HelpCenterPage isLoggedIn={!!session} />;
}
