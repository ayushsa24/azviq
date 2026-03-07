import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
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
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) || null;
      }
      return session;
    },
  },

  session: {
    strategy: "jwt" as const,
  },

  pages: {
    signIn: "/login",
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
