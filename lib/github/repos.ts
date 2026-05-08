import { githubRequest } from "@/lib/github/client";

export type RepoSummary = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  language: string | null;
  owner: { login: string };
  default_branch: string;
  html_url: string;
};

export const listRepositories = async () =>
  githubRequest<RepoSummary[]>("/user/repos?per_page=100&sort=updated");

export const getAuthenticatedGithubUser = async () =>
  githubRequest<{ login: string }>("/user");

const parseRepoFullName = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected owner/repo.");
  }
  return { owner, repo };
};

export const getRepository = async (fullName: string) => {
  const { owner, repo } = parseRepoFullName(fullName);
  return githubRequest<RepoSummary>(`/repos/${owner}/${repo}`);
};

export const tryGetRepository = async (fullName: string) => {
  try {
    return await getRepository(fullName);
  } catch (error) {
    if (error instanceof Error && error.message.includes("GitHub API error 404")) {
      return null;
    }
    throw error;
  }
};

export const createRepository = async ({
  owner,
  name,
  description,
  isPrivate,
}: {
  owner?: string;
  name: string;
  description?: string;
  isPrivate: boolean;
}) => {
  const user = await getAuthenticatedGithubUser();
  const targetOwner = owner?.trim() || user.login;
  const path = targetOwner === user.login ? "/user/repos" : `/orgs/${targetOwner}/repos`;

  return githubRequest<RepoSummary>(path, "POST", {
    name,
    description,
    private: isPrivate,
    auto_init: true,
  });
};

export const syncRepositories = async () => {
  const repositories = await listRepositories();
  return repositories;
};
