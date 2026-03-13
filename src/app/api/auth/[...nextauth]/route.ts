import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = (req: Request, ctx: any) => {
  // Dynamically set NEXTAUTH_URL for mobile testing via Cloudflare Tunnel
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }

  return NextAuth(authOptions)(req, ctx);
};

export { handler as GET, handler as POST };
