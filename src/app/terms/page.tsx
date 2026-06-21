import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TermsPage from "@/components/TermsPage";

export const metadata = {
  title: "Terms of Service — Azviq",
  description: "Read the Terms of Service governing your use of Azviq.",
};

export default async function Terms() {
  const session = await getServerSession(authOptions);

  return <TermsPage isLoggedIn={!!session} />;
}
