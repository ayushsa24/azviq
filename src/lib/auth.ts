import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials: Record<"email" | "password", string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (!data) return null;

        const match = await bcrypt.compare(
          credentials.password,
          data.password_hash
        );

        if (!match) return null;

        // Block unverified users — they must verify email before logging in
        if (!data.is_verified) {
          // Returning null causes NextAuth to set error=CredentialsSignin
          // The login page detects this and shows the "verify email" message
          throw new Error("AccountNotVerified");
        }

        return {
          id: data.id,
          email: data.email,
          name: data.name || null,
          image: data.avatar_url || null,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        // Check if user exists in Supabase
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, is_onboarded")
          .eq("email", email)
          .maybeSingle();

        const cookieStore = await cookies();
        const authIntent = cookieStore.get("auth_intent_v2")?.value;

        if (!existingUser) {
          if (authIntent === "login") {
            return "/login?error=AccountNotFound";
          }

          // Create new user in Supabase
          const { error } = await supabase
            .from("users")
            .insert([
              {
                id: randomUUID(),
                email: email,
                name: user.name || null,
                avatar_url: user.image || null,
                password_hash: "OAUTH_USER", // Required by DB but not used for Google users
                is_onboarded: false,
                is_verified: true, // Auto-verified via Google
              },
            ]);

          if (error) {
            console.error("Error creating Google user in Supabase:", error);
            return false;
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }

      // Always fetch the latest status from Supabase to avoid stale sessions
      if (token.email) {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, is_onboarded, name, avatar_url")
          .eq("email", token.email)
          .maybeSingle();

        if (dbUser) {
          token.id = dbUser.id;
          token.is_onboarded = dbUser.is_onboarded;
          token.name = dbUser.name || null;
          token.image = dbUser.avatar_url || null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) || null;
        session.user.image = (token.image as string) || null;
        // @ts-ignore
        session.user.id = (token.id as string) || null;
        // @ts-ignore
        session.user.is_onboarded = !!token.is_onboarded;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt" as const,
  },

  // ⚠️ DO NOT REMOVE — This is required for both localhost AND Cloudflare tunnel login to work.
  // In production, enforce __Secure- prefix. In development, use a consistent name to avoid static/dynamic mismatch.
  useSecureCookies: process.env.NODE_ENV === "production",

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https://"),
      },
    },
  },

  pages: {
    signIn: "/login",
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
