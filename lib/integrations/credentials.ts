import { prisma } from "@/lib/prisma";

export const getProviderToken = async (provider: "github" | "vercel") => {
  const envToken =
    provider === "github"
      ? process.env.GITHUB_APP_CLIENT_SECRET || process.env.GITHUB_TOKEN
      : process.env.VERCEL_API_TOKEN;

  if (envToken) {
    return envToken;
  }

  if (!process.env.DATABASE_URL) {
    return null;
  }

  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!organization) {
    return null;
  }

  const credential = await prisma.integrationCredential.findUnique({
    where: {
      organizationId_provider: {
        organizationId: organization.id,
        provider,
      },
    },
  });

  return credential?.accessToken ?? null;
};
