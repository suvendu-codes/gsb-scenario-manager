<!--
The Codex review reads this description. The more precise the Design intent
section, the more useful the design-conformance feedback.
-->

## Ticket

<!-- e.g. SMF-294 — required so the reviewer can pull the ticket description. -->

SMF-

## What this changes

<!-- One or two sentences. What a reviewer should expect to see in the diff. -->

## Design intent

<!--
How this is built and why. Name the approach, not just the outcome.
Link any Confluence design page; the reviewer will read it.
Examples: new server action vs route handler, where validation lives,
what goes into shared-types, caching/revalidation choices.
-->

## Deviations from the design

<!--
Anything that differs from the ticket, the Confluence page, or existing
patterns in the codebase, and why. Write "None" if there are none.
Undeclared deviations are what design review is meant to catch, so
declaring them here saves a round trip.
-->

None

## Testing

<!-- What you ran, and what a reviewer should try. -->

## Checklist

- [ ] Ticket number filled in above
- [ ] Design intent describes the approach, not only the result
- [ ] Deviations declared, or "None"
- [ ] Shared types updated in `packages/shared-types` if contracts changed
- [ ] `pnpm lint` and `pnpm build` pass locally
