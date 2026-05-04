import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { isDemoMode } from "@/lib/config";
import { prisma } from "@/lib/prisma";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Demo Login",
    credentials: {
      email: { label: "Email", type: "email" },
      name: { label: "Name", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email) {
        return null;
      }

      return {
        id: credentials.email,
        email: credentials.email,
        name: credentials.name ?? credentials.email,
      };
    },
  }),
];

if (process.env.GITHUB_APP_CLIENT_ID && process.env.GITHUB_APP_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_APP_CLIENT_ID,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: isDemoMode ? undefined : PrismaAdapter(prisma),
  providers,
  session: {
    strategy: isDemoMode ? "jwt" : "database",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const authHandler = NextAuth(authOptions);
