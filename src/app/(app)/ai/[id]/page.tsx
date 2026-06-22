import AiPage from "../page";

export const metadata = {
  title: "AI Chat",
};


export default function AiChatPage({ params }: { params: { id: string } }) {
  // We can pass the id down if needed, but AiPage currently handles its own 
  // params via URL or state. For consistency with the requirement of [id],
  // we render the same component which will handle the active chat.
  return <AiPage />;
}
