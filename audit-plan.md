# Engineering Competition Review Plan

This document tracks a systematic, senior-level audit of the codebase with a focus on correctness, security, maintainability, performance, and production readiness. No new features—only improvements.

## Scope and Approach

- One section per pass; ordered by highest impact on reliability and security.
- For each section: identify issues, explain why they matter, and propose concise, actionable improvements.
- Keep changes minimal, type-safe, and aligned with project standards.

## Sections

1. Configuration and Environment
   - Files: `.env.example`, `src/lib/env.ts`, `src/types/environment.ts`, `next.config.ts`, `vercel.json`, `Dockerfile`, `docker-compose*`, `supabase/*`, `prisma/schema.prisma`
   - Focus: missing/unused env vars, strict parsing/validation, runtime vs build-time exposure, safe defaults.

2. Database and Migrations (Prisma)
   - Files: `prisma/schema.prisma`, `prisma/migrations/*`, `src/server/db.ts`
   - Focus: schema correctness, indexes, relations, naming consistency, migration safety.

3. Backend: Domain Services and Utilities
   - Files: `src/lib/*.ts`
   - Focus: separation of concerns, token handling, idempotency, timeouts/retries, error typing, rate limiting.

4. API Routers and HTTP Endpoints
   - Files: `src/server/api/*`, `src/app/api/**/*`
   - Focus: Zod validation, auth boundaries, webhook verification, logging, resilience.

5. Frontend App Router and Pages
   - Files: `src/app/**/*`
   - Focus: server vs client boundaries, data fetching, caching, error boundaries, metadata.

6. Frontend Components
   - Files: `src/components/**/*`
   - Focus: accessibility, prop typing, state isolation, render perf, Tailwind quality.

7. Types and Schemas
   - Files: `src/types/**/*`, `src/app/types/*`, shared schemas in `src/types/schemas.ts`
   - Focus: duplication, drift from DB, strictness, reuse of primitives.

8. Functions Package
   - Files: `functions/*`
   - Focus: dead code, env use, logging, error handling.

9. CI/CD and Tooling
   - Files: `.github/workflows/*`, `eslint.config.mjs`, `tsconfig.json`, Husky hooks
   - Focus: typecheck/lint/test in CI, secret safety, reproducibility.

10. Security/Compliance Sweep

- Cross-cut: secret handling, GitHub App signatures, JWT/crypto, rate limiting, replay protection.

## Deliverables Per Section

- Findings: ranked list (critical → low)
- Improvements: small, safe diffs with rationale
- Verification: lint/build/tests steps

## Status

- [ ] 1. Configuration and Environment
- [ ] 2. Database and Migrations (Prisma)
- [ ] 3. Backend: Domain Services and Utilities
- [ ] 4. API Routers and HTTP Endpoints
- [ ] 5. Frontend App Router and Pages
- [ ] 6. Frontend Components
- [ ] 7. Types and Schemas
- [ ] 8. Functions Package
- [ ] 9. CI/CD and Tooling
- [ ] 10. Security/Compliance Sweep

## Notes

- After each change batch: run `pnpm lint` and `pnpm build` and iterate until zero errors/warnings for touched files.
- Favor explicit return types, Zod schemas, and minimal, testable changes.
