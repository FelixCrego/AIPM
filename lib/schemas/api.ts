import { z } from "zod";

export const issueCreateSchema = z.object({
  repoFullName: z.string().min(3),
  title: z.string().min(3),
  body: z.string().min(3),
  labels: z.array(z.string()).default([]),
  assignees: z.array(z.string()).default([]),
});

export const prCommentSchema = z.object({
  repoFullName: z.string().min(3),
  prNumber: z.number().int().positive(),
  comment: z.string().min(3),
});

export const dailyPlanRequestSchema = z.object({
  forceRefresh: z.boolean().optional(),
});

export const qaReviewRequestSchema = z.object({
  pullRequestId: z.string().min(1),
  deploymentId: z.string().optional(),
});

export const deploymentAnalysisRequestSchema = z.object({
  deploymentId: z.string().min(1),
});

export const recommendAssigneeRequestSchema = z.object({
  issueId: z.string().min(1),
});
