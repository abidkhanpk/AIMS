# Copilot Instructions for AIMS

## Project Overview
AIMS is a Next.js/TypeScript application for managing school administration, including fees, salaries, subscriptions, notifications, and user roles. The backend uses Prisma ORM for database access and migrations.

## Architecture & Key Components
- **Frontend**: Located in `src/components/` and `src/pages/`. Uses React components and Next.js pages. Layout and dashboard components are central for UI structure.
- **API Routes**: All backend logic is in `src/pages/api/`, organized by domain (e.g., `fees/`, `salaries/`, `subscriptions/`). Each subfolder contains CRUD and workflow endpoints.
- **Database**: Prisma schema in `prisma/schema.prisma`. Migrations in `prisma/migrations/`. Seed data in `prisma/seed.ts`.
- **Auth**: NextAuth integration in `src/pages/api/auth/[...nextauth].ts` and `src/pages/auth/signin.tsx`.

## Developer Workflows
- **Start Dev Server**: `npm run dev` (Next.js)
- **Run Migrations**: `npx prisma migrate dev`
- **Seed Database**: `npx ts-node prisma/seed.ts`
- **Build for Production**: `npm run build`
- **Prisma Studio**: `npx prisma studio` for DB inspection

## Conventions & Patterns
- **API Structure**: Each domain (fees, salaries, etc.) has its own folder under `src/pages/api/`. Endpoints are file-based, e.g., `pay.ts`, `verify.ts`, `update.ts`.
- **Type Safety**: Use TypeScript throughout. Shared types in `src/types/`.
- **Prisma Usage**: All DB access via Prisma client (`src/lib/prisma.ts`). Avoid raw SQL unless necessary.
- **Notifications**: Centralized in `src/pages/api/notifications/` and UI in `src/components/NotificationDropdown.tsx`.
- **Dashboards**: Role-based dashboards in `src/components/dashboards/`.
- **Timezone Handling**: Use utilities in `src/utils/timezones.ts`.

## Integration Points
- **External Auth**: NextAuth for authentication.
- **File Uploads**: Handled in `src/pages/api/upload/logo.ts`.
- **Currency Settings**: Managed via `src/pages/api/settings/currency.ts`.

## Examples
- To add a new fee type: update `prisma/schema.prisma`, run migration, add API logic in `src/pages/api/fees/definitions.ts`, and update UI in `src/components/dashboards/FeeManagementTab.tsx`.
- To extend subscriptions: use `src/pages/api/subscriptions/extend.ts` and update related UI/components.

## Key Files & Directories
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `src/pages/api/` (all backend logic)
- `src/components/` (UI)
- `src/types/` (shared types)
- `src/lib/prisma.ts` (Prisma client)

---
For unclear workflows or missing conventions, ask the user for clarification or examples from their recent work.
Use best practices, keep the code production-ready, and ensure scalability for future modules.
First make a detailed numbered list of actions that you'll take (number preferably in order of action that you'll take) and once an action is completed, show that action no:.. is completed so that if you stuck before completion of these tasks, i can tell you in future message that up to which action no is completed. DO NOT, I repeat DO NOT disturb/remove/modify any other option or feature. MUST implement what Iuser requested above, don’t skip any or leave incomplete. Only  report completed when it is completed and fulfill my requirement stated above.
Complete all user's requirements in single message without confirming from which (which will waste one message from his quota). Just start implementing.
At the end, run npx prisma commands (if required) and npm run build command and fix issues/errors if there are any but remember DO NOT remove any feature that is implemented in the code, just fix the issue keeping everything exactly as present.

Important Database Migration Rules:  
- All database migrations must be **backward-compatible** with the existing schema.  
- Do NOT afford to use `prisma migrate reset` as this is a production database.  
- Use additive migrations (adding new tables, fields, relations) instead of destructive ones.  
- If schema changes are unavoidable (e.g., renaming, changing types), handle them via safe steps:
   - First, add new fields while keeping the old ones.  
   - Backfill or migrate data safely.  
   - Only deprecate/remove old fields once the new schema is stable.  
- Ensure that all migrations run without breaking existing production data.  