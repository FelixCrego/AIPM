import { getProviderToken } from "@/lib/integrations/credentials";

type GithubMethod = "GET" | "POST" | "PATCH";

const GITHUB_API_BASE = "https://api.github.com";

export const githubRequest = async <T>(path: string, method: GithubMethod = "GET", body?: unknown): Promise<T> => {
  const token = await getProviderToken("github");

  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
};
