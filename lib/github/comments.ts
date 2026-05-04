import { githubRequest } from "@/lib/github/client";

const parseRepo = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected owner/repo.");
  }
  return { owner, repo };
};

export const createPullRequestComment = async (repoFullName: string, prNumber: number, comment: string) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, "POST", {
    body: comment,
  });
};

export const listPullRequestComments = async (repoFullName: string, prNumber: number) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`);
};
