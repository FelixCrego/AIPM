import { githubRequest } from "@/lib/github/client";

type RepoSummary = {
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

export const syncRepositories = async () => {
  const repositories = await listRepositories();
  return repositories;
};
