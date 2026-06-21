import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PrivacyPolicyPage from "@/components/PrivacyPolicyPage";

export const metadata = {
  title: "Privacy Policy — Azviq",
  description: "Learn how Azviq collects, uses, and protects your personal data.",
};

export default async function Privacy() {
  const session = await getServerSession(authOptions);

  return <PrivacyPolicyPage isLoggedIn={!!session} />;
}
