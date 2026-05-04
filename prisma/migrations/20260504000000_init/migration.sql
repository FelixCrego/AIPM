-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'DEVELOPER', 'QA');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'BLOCKED', 'QA', 'DONE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "IssueState" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PRState" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "DeploymentState" AS ENUM ('QUEUED', 'BUILDING', 'READY', 'ERROR', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DEVELOPER',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "businessGoal" TEXT,
    "targetUser" TEXT,
    "repositoryId" TEXT,
    "vercelProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "githubUsername" TEXT,
    "role" TEXT NOT NULL,
    "strengths" TEXT[],
    "currentCapacity" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "language" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubIssueId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" "IssueState" NOT NULL DEFAULT 'OPEN',
    "labels" TEXT[],
    "assignees" TEXT[],
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "aiSummary" TEXT,
    "aiRecommendedAssignee" TEXT,
    "aiRiskScore" DOUBLE PRECISION,
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubPullRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "githubPrId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" "PRState" NOT NULL DEFAULT 'OPEN',
    "author" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "changedFiles" INTEGER NOT NULL DEFAULT 0,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "mergeable" BOOLEAN,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "aiReviewStatus" TEXT,
    "aiRiskScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubPullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubCommit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VercelProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vercelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "framework" TEXT,
    "latestDeploymentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VercelProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VercelDeployment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vercelProjectId" TEXT NOT NULL,
    "vercelDeploymentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "state" "DeploymentState" NOT NULL,
    "target" TEXT,
    "branch" TEXT,
    "commitSha" TEXT,
    "githubPrNumber" INTEGER,
    "errorMessage" TEXT,
    "aiSummary" TEXT,
    "aiRiskScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VercelDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDailyPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "priorities" JSONB NOT NULL,
    "assignments" JSONB NOT NULL,
    "blockers" JSONB NOT NULL,
    "qaItems" JSONB NOT NULL,
    "deploymentRisks" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "riskLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIDailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIQAReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pullRequestId" TEXT,
    "deploymentId" TEXT,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "missingTests" JSONB NOT NULL,
    "acceptanceCriteriaStatus" TEXT,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIQAReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "reason" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMemory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "installationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE INDEX "Repository_organizationId_idx" ON "Repository"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubIssue_githubIssueId_key" ON "GitHubIssue"("githubIssueId");

-- CreateIndex
CREATE INDEX "GitHubIssue_organizationId_idx" ON "GitHubIssue"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubIssue_repositoryId_number_key" ON "GitHubIssue"("repositoryId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubPullRequest_githubPrId_key" ON "GitHubPullRequest"("githubPrId");

-- CreateIndex
CREATE INDEX "GitHubPullRequest_organizationId_idx" ON "GitHubPullRequest"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubPullRequest_repositoryId_number_key" ON "GitHubPullRequest"("repositoryId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubCommit_sha_key" ON "GitHubCommit"("sha");

-- CreateIndex
CREATE INDEX "GitHubCommit_organizationId_idx" ON "GitHubCommit"("organizationId");

-- CreateIndex
CREATE INDEX "GitHubCommit_repositoryId_idx" ON "GitHubCommit"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "VercelProject_vercelId_key" ON "VercelProject"("vercelId");

-- CreateIndex
CREATE INDEX "VercelProject_organizationId_idx" ON "VercelProject"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "VercelDeployment_vercelDeploymentId_key" ON "VercelDeployment"("vercelDeploymentId");

-- CreateIndex
CREATE INDEX "VercelDeployment_organizationId_idx" ON "VercelDeployment"("organizationId");

-- CreateIndex
CREATE INDEX "AIDailyPlan_organizationId_idx" ON "AIDailyPlan"("organizationId");

-- CreateIndex
CREATE INDEX "AIQAReview_organizationId_idx" ON "AIQAReview"("organizationId");

-- CreateIndex
CREATE INDEX "TaskAssignment_organizationId_idx" ON "TaskAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "ProjectMemory_organizationId_idx" ON "ProjectMemory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMemory_projectId_key_key" ON "ProjectMemory"("projectId", "key");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_idx" ON "ActivityLog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_organizationId_provider_key" ON "IntegrationCredential"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_vercelProjectId_fkey" FOREIGN KEY ("vercelProjectId") REFERENCES "VercelProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubIssue" ADD CONSTRAINT "GitHubIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubIssue" ADD CONSTRAINT "GitHubIssue_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubCommit" ADD CONSTRAINT "GitHubCommit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubCommit" ADD CONSTRAINT "GitHubCommit_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VercelProject" ADD CONSTRAINT "VercelProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VercelDeployment" ADD CONSTRAINT "VercelDeployment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VercelDeployment" ADD CONSTRAINT "VercelDeployment_vercelProjectId_fkey" FOREIGN KEY ("vercelProjectId") REFERENCES "VercelProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIDailyPlan" ADD CONSTRAINT "AIDailyPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIQAReview" ADD CONSTRAINT "AIQAReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIQAReview" ADD CONSTRAINT "AIQAReview_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "GitHubPullRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIQAReview" ADD CONSTRAINT "AIQAReview_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "VercelDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "GitHubIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMemory" ADD CONSTRAINT "ProjectMemory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMemory" ADD CONSTRAINT "ProjectMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationCredential" ADD CONSTRAINT "IntegrationCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
