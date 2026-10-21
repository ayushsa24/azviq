import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import FeedbackPage from "@/components/FeedbackPage";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Share your thoughts, report bugs, or suggest features for Azviq.",
  alternates: {
    canonical: "/feedback",
  },
};

export default async function Feedback() {
  const session = await getServerSession(authOptions);

  return <FeedbackPage isLoggedIn={!!session} />;
}
