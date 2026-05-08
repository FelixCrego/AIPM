# DevPilot AI

DevPilot AI is an AI-powered engineering command center for software teams.

It answers:
- What should every developer work on today?
- What is blocked?
- What PRs need review?
- What deployments failed?
- What is ready for QA?
- What is safe to ship?

The MVP ships with demo mode data so you can use the product before connecting GitHub/Vercel.

## Tech Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma 7
- Auth.js (NextAuth)
- OpenAI API
- GitHub REST integration layer
- Vercel REST integration layer
- Zod + React Hook Form

## Modules in MVP
- Dashboard
- Projects
- Repositories
- Issues
- Pull Requests (+ PR detail QA flow)
- Deployments
- Developers (workload)
- Settings

## Core AI Features
- `generateDailyPlan()`
- `reviewPullRequest()`
- `analyzeDeployment()`
- `recommendAssignee()`
- `generateIssueFromProjectRequest()`

AI outputs are structured and validated with Zod.

## API Routes
- `POST /api/sync/github`
- `POST /api/sync/vercel`
- `POST /api/ai/daily-plan`
- `POST /api/ai/qa-review`
- `POST /api/ai/analyze-deployment`
- `POST /api/ai/recommend-assignee`
- `POST /api/github/issues/create`
- `POST /api/github/prs/comment`
- `GET /api/dashboard/summary`
- `GET /api/developers/workload`

## Environment Variables
Copy `.env.example` to `.env` and fill values:

```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_REALTIME_TRANSCRIBE_MODEL=gpt-4o-transcribe
OPENAI_REALTIME_VOICE=alloy
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=
VERCEL_API_TOKEN=
VERCEL_TEAM_ID=
DEMO_MODE=true
```

## Local Setup
1. Install dependencies:
```bash
npm install
```
2. Generate Prisma client:
```bash
npm run db:generate
```
3. If using PostgreSQL, run schema migration:
```bash
npm run db:migrate
```
4. Seed demo data (works with configured DB):
```bash
npm run db:seed
```
5. Run dev server:
```bash
npm run dev
```

## PostgreSQL Notes
- Prisma 7 uses `prisma.config.ts` for datasource URL config.
- `prisma/schema.prisma` defines models and relations.
- Initial SQL migration is included at `prisma/migrations/20260504000000_init/migration.sql`.

## Demo Mode
When `DEMO_MODE=true` or `DATABASE_URL` is unset:
- The app runs from seeded in-memory demo fixtures in `lib/demo-data.ts`.
- Dashboards and AI endpoints still work with realistic data.
- Sync endpoints return safe non-persisted responses when DB is unavailable.

Seeded dataset includes:
- 1 organization
- 3 developers (Michael, Narendra, Peculiar)
- 2 projects
- 3 repositories
- 8 issues
- 4 pull requests
- 5 Vercel deployments (2 failed)
- 1 AI daily plan
- 2 AI QA reviews

## GitHub Integration
Service layer files:
- `lib/github/client.ts`
- `lib/github/repos.ts`
- `lib/github/issues.ts`
- `lib/github/pulls.ts`
- `lib/github/comments.ts`
- `lib/github/sync.ts`

Supported operations in MVP service layer:
- List repos
- List/sync issues
- Create/update issues
- Assign issue
- Add labels
- List/sync pull requests
- Read PR files
- Add PR comment

OAuth setup:
- Create a GitHub OAuth app with callback URL `${NEXTAUTH_URL}/api/auth/callback/github`.
- Set `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET`.
- Use Settings -> Connect GitHub to authorize repository access. The app requests `repo`, `read:org`, `read:user`, and `user:email` scopes.
- `GITHUB_TOKEN` can still be used for server-only automation, but OAuth user tokens are preferred for real connected workspaces.

## Vercel Integration
Service layer files:
- `lib/vercel/client.ts`
- `lib/vercel/projects.ts`
- `lib/vercel/deployments.ts`
- `lib/vercel/sync.ts`

Supported operations in MVP service layer:
- List Vercel projects
- List deployments
- Get deployment details
- Analyze failed deployment

## AI Daily Plan Flow
1. Dashboard button calls `POST /api/ai/daily-plan`.
2. AI service ingests issues, PRs, deployments, developers, project context.
3. Returns actionable plan with priorities, assignments, blockers, QA items, risks, and next actions.

## AI QA Review Flow
1. PR detail page runs `POST /api/ai/qa-review`.
2. AI evaluates PR context and returns checklist, missing tests, risks, and recommendation.
3. Optional button posts AI review text to GitHub via `POST /api/github/prs/comment`.

## Auth
- Auth.js is configured with demo credentials login.
- GitHub provider can be enabled when app client ID/secret are set.

## What Is Real vs Mocked
Real:
- App pages/UI
- Prisma schema + migration + seed
- API route contracts
- AI, GitHub, Vercel service wiring

Mocked/Fallback:
- AI responses if `OPENAI_API_KEY` is missing
- Demo data path when DB is not configured
- Sync persistence behavior when DB is unavailable

## Future Codex Integration Plan
Planned phase:
- Send issues to Codex for implementation
- Ask Codex to review PRs
- Ask Codex to generate tests
- Ask Codex to propose fixes for failed deployments
- Integrate Codex GitHub Action in CI/CD for automated review and patch proposals

## Useful Commands
```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
```
