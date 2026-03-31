import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = (req: Request, ctx: any) => {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  
  if (host) {
    const nextAuthUrl = `${proto}://${host}`;
    process.env.NEXTAUTH_URL = nextAuthUrl;
    
    // Dynamically update cookie settings to match the request protocol
    const isHttps = proto === "https";
    authOptions.useSecureCookies = isHttps;
    if (isHttps) {
      authOptions.cookies = {
        sessionToken: {
          name: `__Secure-next-auth.session-token`,
          options: {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: true,
          },
        },
      };
    } else {
      authOptions.cookies = undefined;
    }
  }

  return NextAuth(authOptions)(req, ctx);
};

export { handler as GET, handler as POST };
