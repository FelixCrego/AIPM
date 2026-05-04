import { githubRequest } from "@/lib/github/client";

const parseRepo = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected owner/repo.");
  }
  return { owner, repo };
};

export const listPullRequests = async (repoFullName: string) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/pulls?state=all&per_page=100`);
};

export const getPullRequest = async (repoFullName: string, prNumber: number) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`);
};

export const listPullRequestFiles = async (repoFullName: string, prNumber: number) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`);
};

export const syncPullRequests = async (repoFullName: string) => listPullRequests(repoFullName);
