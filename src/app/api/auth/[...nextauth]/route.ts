import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";

export const authOptions = {
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
        };
      },
    }),
  ],

  session: {
    strategy: "jwt" as const,
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
