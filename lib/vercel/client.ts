import { getProviderToken } from "@/lib/integrations/credentials";

const VERCEL_API_BASE = "https://api.vercel.com";

export const vercelRequest = async <T>(path: string): Promise<T> => {
  const token = await getProviderToken("vercel");
  if (!token) {
    throw new Error("Vercel token not configured");
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const hasQuery = path.includes("?");
  const withTeam = teamId
    ? `${path}${hasQuery ? "&" : "?"}teamId=${encodeURIComponent(teamId)}`
    : path;

  const response = await fetch(`${VERCEL_API_BASE}${withTeam}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vercel API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
};
