import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import FeedbackPage from "@/components/FeedbackPage";

export const metadata = {
  title: "Feedback",
  description: "Share your thoughts, report bugs, or suggest features for Azviq.",
};

export default async function Feedback() {
  const session = await getServerSession(authOptions);

  return <FeedbackPage isLoggedIn={!!session} />;
}
