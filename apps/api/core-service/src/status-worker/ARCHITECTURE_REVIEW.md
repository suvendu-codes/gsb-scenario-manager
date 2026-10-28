# Status worker contract review

The current design is in the [Event Schema Proposal](https://greyorange-work.atlassian.net/wiki/spaces/SVRPERFTM/pages/236912869).

## Implemented guarantees

- Mandatory correlation ID and optional engine run ID, with immutable binding when supplied.
- Engine-confirmed state separate from pending command. Acceptance retains the request;
  matching destination/rejection or any terminal status clears it atomically.
- Rejected Run explicitly fails; results follow completed/failed without changing outcome.
- One engine sequence stream for status/results; timestamps do not define their ordering.
- Durable receipt ledger verifies duplicates and holds future events behind gaps. A repaired
  contiguous prefix is replayed under the same scenario-then-run locks.
- Current-run pointer controls scenario updates; historical events cannot affect a new run.
- Heartbeats record observations only. Silence never triggers automatic execution failure.
- Kafka acknowledgement follows the entire transaction; rollback includes receipts and scenario.

## Open boundaries and TODOs

- Engine event retrieval API, retry windows, bounded replay/receipt retention, and permanent-loss
  decisions require agreement. There is no automatic HTTP repair or missing_events failure.
- Heartbeat sequencing, clock skew, meaningful progress, and phase support are not frozen.
- Command API/outbox is separate: it must enforce one pending command, active execution and
  recovery blocking, and persist command/outbox atomically.
- Invalid envelopes and contract violations still block their Kafka partition; no DLQ or
  durable poison-event quarantine is introduced by the gap-holding path.
- Fresh databases use the single db/schema.sql initializer; no migration chain or legacy execution reconciliation is needed.
- Legacy verdict storage remains read-only; schema versioning/deployment compatibility needs review.
- Independent worker/Kafka monitoring and health alerts remain observability work.

See README for local commands and test/module/README.md for plain-language module coverage.
