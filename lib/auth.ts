import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { appConfig, isDemoMode } from "@/lib/config";
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
      authorization: {
        params: {
          scope: "read:user user:email repo read:org",
        },
      },
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
  events: {
    async signIn({ user, account }) {
      if (isDemoMode || account?.provider !== "github" || !account.access_token) {
        return;
      }

      const organization =
        (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })) ??
        (await prisma.organization.create({
          data: { name: appConfig.organizationFallbackName },
        }));

      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: organization.id },
        });
      }

      await prisma.integrationCredential.upsert({
        where: {
          organizationId_provider: {
            organizationId: organization.id,
            provider: "github",
          },
        },
        create: {
          organizationId: organization.id,
          provider: "github",
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          metadata: {
            connected: true,
            scope: account.scope ?? null,
            providerAccountId: account.providerAccountId ?? null,
          },
        },
        update: {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          metadata: {
            connected: true,
            scope: account.scope ?? null,
            providerAccountId: account.providerAccountId ?? null,
          },
        },
      });
    },
  },
};

export const authHandler = NextAuth(authOptions);
