import { githubRequest } from "@/lib/github/client";

type IssueCreatePayload = {
  title: string;
  body: string;
  labels?: string[];
  assignees?: string[];
};

const parseRepo = (fullName: string) => {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected owner/repo.");
  }
  return { owner, repo };
};

export const listIssues = async (repoFullName: string) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues?state=all&per_page=100`);
};

export const syncIssues = async (repoFullName: string) => listIssues(repoFullName);

export const createIssue = async (repoFullName: string, payload: IssueCreatePayload) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues`, "POST", payload);
};

export const updateIssue = async (
  repoFullName: string,
  issueNumber: number,
  payload: Partial<IssueCreatePayload> & { state?: "open" | "closed" },
) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`, "PATCH", payload);
};

export const assignIssue = async (repoFullName: string, issueNumber: number, assignees: string[]) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/assignees`, "POST", { assignees });
};

export const addLabels = async (repoFullName: string, issueNumber: number, labels: string[]) => {
  const { owner, repo } = parseRepo(repoFullName);
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}/labels`, "POST", { labels });
};
