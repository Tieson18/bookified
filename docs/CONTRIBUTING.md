# Contributing

## Development Setup

Follow [`SETUP.md`](SETUP.md), then verify:

```bash
npm install
npm run lint
npm run build
```

## Branch Naming

Use lowercase, hyphenated names:

```text
feature/pdf-ocr
fix/vapi-microphone-state
docs/deployment-checklist
refactor/book-persistence
chore/update-dependencies
```

Keep each branch focused on one change.

## Commit Messages

Use Conventional Commit-style messages:

```text
feat: add book deletion workflow
fix: scope voice sessions to book owners
docs: document Vapi webhook setup
refactor: isolate Blob cleanup service
test: cover upload validation
chore: update Next.js
```

Use an imperative, concise subject. Add a body when the reason, migration, or
risk is not obvious from the diff.

## Code Style

- Use TypeScript and keep strict mode passing.
- Follow the repository's existing App Router structure.
- Read the relevant local Next.js guide in `node_modules/next/dist/docs/`
  before changing framework APIs or conventions.
- Default pages and layouts to Server Components.
- Add `"use client"` only for state, events, hooks, or browser APIs.
- Mark sensitive data services with `server-only`.
- Mark browser-only SDK services with `client-only`.
- Use `@/*` imports for project modules.
- Validate untrusted input with Zod or explicit checks.
- Return minimal serializable DTOs from server code.
- Keep Clerk authorization close to each data operation.
- Keep comments concise and explain why, not what.
- Reuse the existing `ActionResult` pattern for book actions.
- Use Tailwind CSS 4 conventions already present in `app/globals.css`.
- Reuse shadcn and Radix primitives before adding another UI system.

## Local Quality Checks

```bash
npm run lint
npm run build
```

`npm run build` performs the TypeScript and Next.js production build.

There is no automated test script at present. A pull request that adds tests
should also add the corresponding package script and document it here.

For manual verification, test the affected workflow in development and with
`npm run start` after a production build.

## Pull Request Checklist

- The change has a focused purpose.
- No secrets, tokens, `.env` files, or private user data are included.
- Authentication and ownership checks are performed in every new Server Action
  or Route Handler.
- Inputs, file sizes, and provider payloads are validated.
- Client and server module boundaries are correct.
- Error messages are safe for end users.
- Rollback or cleanup behavior exists for multi-step writes.
- MongoDB indexes and migration impact were considered.
- `npm run lint` passes.
- `npm run build` passes.
- Relevant manual flows were tested.
- Documentation and `.env.example` were updated when behavior changed.
- `CHANGELOG.md` was updated for user-visible or operational changes.
- Screenshots are included for meaningful UI changes.

## Adding Features Safely

### 1. Trace the Trust Boundary

Identify which values come from:

- The browser
- Clerk
- Vapi or another webhook
- Blob storage
- MongoDB

Treat browser and webhook payloads as untrusted.

### 2. Choose the Correct Runtime

- Render and fetch data in Server Components.
- Use Server Actions for authenticated application mutations.
- Use Route Handlers for provider callbacks and HTTP APIs.
- Use Client Components only for interactivity and browser capabilities.

### 3. Enforce Authentication and Ownership

Do not rely only on `proxy.ts`, a page redirect, or hidden UI. Re-check the
Clerk user inside each server entry point and filter database operations by
`clerkId`.

### 4. Validate and Limit Work

Set bounds for strings, arrays, file sizes, tool-call counts, and provider
requests. Expensive features should include rate limiting and plan checks.

### 5. Design Failure Recovery

For workflows that touch both Blob and MongoDB:

- Record what was created.
- Make cleanup idempotent.
- Roll back partial database state.
- Report incomplete cleanup separately.

### 6. Update Documentation

Update:

- `README.md` for user-facing capabilities
- `docs/ARCHITECTURE.md` for flow or boundary changes
- `docs/API.md` for contracts
- `docs/ENVIRONMENT.md` and `.env.example` for configuration
- `docs/DEPLOYMENT.md` for operations
- `docs/SECURITY.md` for trust or privacy changes

## Dependency Changes

Before upgrading Next.js, React, Clerk, Vapi, Vercel Blob, Mongoose, PDF.js, or
Tailwind:

1. Read the installed or target version's official migration guide.
2. Review breaking changes.
3. Keep `package-lock.json` synchronized.
4. Run lint and a production build.
5. Manually test authentication, upload, and voice flows.

Do not assume APIs from an older Next.js version apply to this project.

## Reporting Security Issues

Do not open a public issue containing credentials, private documents, or an
unpatched vulnerability. Follow the private reporting guidance in
[`SECURITY.md`](SECURITY.md).
