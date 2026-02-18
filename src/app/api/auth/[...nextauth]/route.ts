import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";

const handler = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
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
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };
