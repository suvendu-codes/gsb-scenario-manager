# Code Review Guidelines

Applied by the automated Codex review (`.github/workflows/codex-review.yml`) and by human reviewers. The automated pass runs when the `ready-for-review` label is added to a PR. It is a first pass, not an approval: every PR still needs a human reviewer.

## Severity

- **[blocker]** — bug, security hole, data loss, or a breaking change to a shared contract. Must be fixed before merge.
- **[major]** — likely defect, missing error handling, or new behaviour with no test.
- **[minor]** — maintainability or clarity problem worth fixing.
- **[nit]** — optional preference. Skip anything ESLint or Prettier enforces.

## Design conformance

Judged against `.github/codex/context/design-context.md` (the Jira ticket, linked Confluence pages, and the PR description), not against the reviewer's own preferences.

- The change implements what the ticket describes — no silent scope creep, no quietly dropped requirements.
- Where the design names an approach, the code takes it, or the PR declares and justifies the deviation under "Deviations from the design".
- Types, Zod schemas and API shapes match the contract the design specifies.
- Work deliberately deferred is stated as deferred rather than simply absent.
- A deviation that is declared and reasoned is not a finding. An undeclared one is.

When no design context is available, say so and review practice only.

## All code

- The change does what the PR description says, and nothing unrelated.
- Errors are handled; no swallowed promise rejections; every `async` call is awaited or deliberately detached.
- No secrets, tokens, or credentials in code, fixtures, or logs.
- New logic has tests, and changed behaviour has updated tests.
- No dead code, stray `console.log`, or commented-out blocks.
- New dependencies are justified and maintained. Note any that are unmaintained, redundant with an existing dependency, or that duplicate something the standard library does.
- Changes to shared code (`packages/shared-types`, `apps/web/lib`) account for every call site.

## TypeScript

- No `any`, and no `as` casts that paper over a real type mismatch. Prefer narrowing, generics, or a discriminated union.
- No non-null assertions (`!`) on values that can genuinely be null at runtime.
- Types in `packages/shared-types` stay the single source of truth. Flag a type redefined locally that duplicates a shared one.
- Zod schemas in `apps/web/schemas` and the TypeScript types they feed stay in sync. Prefer `z.infer` over a hand-written duplicate.

## Server code (route handlers, server actions, server components)

- Every input from the client is validated with a Zod schema at the boundary, including `params`, `searchParams`, and request bodies. Reject unknown fields.
- Authentication and authorization are checked on every new route or server action. Watch for IDOR: a resource ID from the client must be checked for ownership.
- No injection risk: parameterized queries, no `eval`, no unsanitized input in shell or `child_process` arguments, no user-controlled path segments in file access.
- Secrets are read from server-side env only. A value needed in the browser must be a deliberate `NEXT_PUBLIC_` variable and must not be a secret.
- Errors returned to the client do not leak stack traces, query text, or internal paths.
- Outbound calls have timeouts; failures are handled rather than left to reject.
- Caching and revalidation are deliberate: check `fetch` cache options, `revalidate`, and `dynamic` against whether the data is user-specific or may be stale.

## Client components

- `'use client'` is present only where a component genuinely needs browser APIs, state, or effects. Flag it when it pushes a large subtree onto the client for no reason.
- Loading, empty, and error states are handled, not just the happy path.
- No XSS vectors: no `dangerouslySetInnerHTML` with data that is not sanitized.
- Hooks are correct: no stale closures, no missing or over-broad dependency arrays, no state updates after unmount, and every subscription, listener, or timer is cleaned up.
- Form handling uses `react-hook-form` with the Zod resolver, and validation on the client is matched by validation on the server. Client-side checks are for UX, never for security.
- Keys on lists are stable and come from the data, not the array index, where items can reorder.
- Accessibility basics: labels tied to inputs, keyboard reachable controls, semantic elements over `div` with a click handler.

## Cross-cutting

- A change to a shared type or an API shape updates producer, consumer, and schema together in the same PR.
- Config and feature flags have safe defaults when the environment variable is unset.
- Workspace boundaries hold: `apps/web` may depend on `packages/*`, never the reverse.

## Out of scope

Formatting, import order, and anything the lint config already enforces.
