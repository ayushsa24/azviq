import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

export const authOptions: NextAuthOptions = {
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

        if (!existingUser) {
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
      
      // Always fetch the latest is_onboarded status from Supabase to avoid stale sessions
      if (token.email) {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, is_onboarded")
          .eq("email", token.email)
          .maybeSingle();

        if (dbUser) {
          token.id = dbUser.id;
          token.is_onboarded = dbUser.is_onboarded;
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

  useSecureCookies: process.env.NODE_ENV === "production",

  pages: {
    signIn: "/login",
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
