# Instructions for AI Agents (Must Follow)

This repository is actively used. Your job is to implement only the requested change(s) without breaking existing behavior.

If any instruction here conflicts with a user request, ask for clarification *only if absolutely necessary*. Otherwise, follow these instructions.

---

## 1) Prime Directive: Do No Harm
- Preserve existing features and behavior unless the request explicitly changes them.
- Keep changes minimal, targeted, and reversible.
- Avoid refactors, rewrites, formatting sweeps, dependency upgrades, or “cleanup” that are not required to complete the request.

---

## 2) Scope Control (Strict)
While editing:
- Change only code directly related to the request.
- Do not modify unrelated functions, rename things “for clarity”, or reorganize folders unless explicitly requested.
- Do not “optimize” or “improve architecture” unless asked.
- If you believe additional changes are necessary or would significantly improve the result:
  - **Do NOT implement them immediately.**
  - Inform the user first with clear reasoning.
  - Wait for explicit approval before proceeding.

After editing:
- If you touched more files than expected, explain why each was necessary.

---

## 3) Understand Before You Change
- Read the surrounding code and patterns used in the project.
- Follow existing conventions (naming, structure, error handling, logging, style).
- If you are unsure how something works, search within the codebase first (references/usages/tests).

---

## 4) Backwards Compatibility & API Safety
- Do not introduce breaking changes to public interfaces (APIs, exported functions, schemas, routes, config formats) unless requested.
- If an interface must change, update *all* call sites and documentation that depend on it.
- Maintain data compatibility:
  - Avoid destructive migrations.
  - Never drop/rename persisted fields without a safe migration plan.

---

## 5) Testing Requirements (Non-Negotiable)
- Run the existing test suite relevant to the change if possible.
- Add or update tests when you change behavior, fix a bug, or add a feature.
- Keep tests focused on the requested behavior (no broad rework).
- If you cannot run tests (environment limitations), say so and:
  - identify which tests should be run by a human/CI,
  - explain what you changed and what could be risky.

---

## 6) Incremental Changes & Reviewability
- Prefer small, readable diffs over big changes.
- Make one logical change per commit/PR section if possible.
- Avoid mixing refactors with functional changes.
- Keep formatting noise out of diffs.

---

## 7) Error Handling & Edge Cases
- Handle failure modes explicitly (null/undefined, network failures, timeouts, empty states).
- Do not swallow errors silently.
- Maintain existing error conventions (error types, status codes, messages).
- Add guardrails where needed, but only where relevant to the requested change.

---

## 8) Security & Privacy Baselines
- Do not log secrets, tokens, passwords, private keys, or sensitive user data.
- Validate and sanitize untrusted inputs.
- Use parameterized queries / safe ORM patterns (avoid injection).
- Follow existing authz/authn patterns; never bypass security checks for convenience.

---

## 9) Performance (Only When Relevant)
- Don’t micro-optimize or refactor for performance unless requested.
- If the requested change could cause regressions (N+1 queries, extra renders, heavy loops), call it out and mitigate minimally.

---

## 10) Dependencies & Tooling (Be Conservative)
- Do not add new dependencies unless necessary.
- Prefer existing utilities/libraries already used in the repo.
- Do not upgrade framework/runtime versions unless explicitly requested.
- If you add a dependency:
  - explain why it’s necessary,
  - keep it minimal,
  - ensure licensing is compatible (if your org has requirements, follow them).

---

## 11) Frontend/UI Changes (If Applicable)
- Preserve existing UX patterns and component conventions.
- Ensure accessibility basics: labels, focus order, keyboard navigation, ARIA only when needed.
- Avoid visual redesigns unless requested.

---

## 12) Documentation
- Update docs only when the change affects usage, setup, env vars, or public APIs.
- Keep doc edits minimal and accurate.

---

## 13) What You Must Report Back
In your final response, include:
1. **Summary** of what you changed (bullets).
2. **Files changed** and why each was touched.
3. **How to test** (commands and/or steps).
4. **Risks / edge cases** (if any) and how you mitigated them.

---

## 14) Hard Prohibitions
You MUST NOT:
- change unrelated behavior “while you’re there”
- rename public functions/routes/fields without updating all usages
- remove code you believe is “unused” without proof (search + references + tests)
- disable lint rules/tests to “make it pass”
- commit secrets or credentials
- make sweeping formatting changes
- change lockfiles unless dependencies changed intentionally
- run build commands automatically after completing changes
- run any build command unless explicitly instructed by the user

---

## 15) Build Execution Rules (Strict)

- **Do NOT run the build command after making code changes.**
- Only execute a build when the user explicitly instructs you to do so.
- When running a build command:
  - Always `cd` into the specific project directory first.
  - Ensure the build output is generated inside that project folder.
  - This ensures the user can directly run the start command without needing to rebuild.

---

## 16) Default Approach Checklist
Use this workflow:
1. Locate the smallest set of files related to the request.
2. Make the minimal code change.
3. Re-check for unintended changes (diff review).
4. Provide the required report-back details.

---

## 17) Prisma Schema & Migration Rules (Strict)

### Prisma Ownership Rule
- **If Prisma is already scaffolded in the repository, Prisma is the single source of truth for the database schema from this point forward.**
- All schema changes **must be made via `schema.prisma`.**
- **Raw SQL must NOT be used** to modify or evolve the database schema (e.g. `ALTER TABLE`, `CREATE INDEX`, etc.) unless explicitly instructed by a human.

### Migration Generation Rule
- **The agent must NOT manually create or edit `migration.sql` files** unless explicitly told to do so.
- Migration files will be generated **only** via Prisma CLI commands (e.g. `prisma migrate dev`) by user himself unless explicitly told to run `prisma migrate dev` command.
- The agent must never attempt to hand-write, reconstruct, or reverse-engineer migrations.

### Allowed Prisma Workflow
- Modify `schema.prisma`
- Generate migrations using Prisma CLI **only when instructed**
- Apply migrations using approved Prisma workflows
- Keep migration history consistent and linear

### Prohibited Actions
- Writing raw SQL for schema evolution when Prisma is present
- Generating `migration.sql` manually
- Bypassing Prisma migrations to “speed things up”
- Run `prisma migrate dev` command unless explicitly told to do so
- Using `prisma db push` as a replacement for migrations unless explicitly instructed

> **Rationale:** Once Prisma is adopted, schema drift caused by raw SQL or hand-written migrations breaks migration history, reproducibility, and production safety.

---

## 18) Versioning Requirement (Strict)

- **If the application displays a version number anywhere** (UI, API response, config, metadata, footer, logs, etc.), that version **MUST be incremented with every commit or modification**.
- Increment the version **for every change**, including small fixes, refactors, or internal updates, unless explicitly instructed otherwise.
- Follow the **existing versioning scheme** used in the project (e.g., Semantic Versioning, build number, revision counter).
- **Do NOT introduce a new versioning format** if one already exists.
- If the version appears in multiple places, **all references MUST be kept in sync**.
- If no version is currently displayed or exposed, **do NOT add one unless explicitly requested**.

---

By working in this repo, you agree to follow these instructions exactly.