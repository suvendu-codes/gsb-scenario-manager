# Status worker module tests

The suite currently expands 52 test families into 116 positive and negative cases.

Run `pnpm test:module` from the repository root with Docker running. The runner
creates isolated PostgreSQL and Kafka resources, runs the single `db/schema.sql` initializer, starts
the worker, runs the cases below, saves TAP/service logs in `test-results/module/`,
and removes its containers and volumes. No real engine is required.

Events use the Confluence contract: a unique correlation per execution, contiguous
status/result sequences starting at 1, optional engine run ID, opaque results,
and separate pending commands. Fixtures seed runs directly; command APIs and the
outbox relay are not exercised.

| Test | Plain-language scenario | Expected result |
| --- | --- | --- |
| SW-01 / emulator or simulator / completed or failed | Send acceptance, running, terminal status and then custom JSON results; replay the same result | Outcome remains terminal; full JSON is stored; sequence advances once; scenario finishes; exact replay changes nothing |
| SW-02 | Receive sequence 3 first; process another run; restart consumer; deliver sequences 1 and 2 | Event 3 is durable and acknowledged without changing confirmed state; other run proceeds; restart retains the gap; repair drains to 3 and clears recovery flag |
| SW-03 / pause, resume, cancel | Seed a pending command; send acceptance followed by its matching destination | Acceptance preserves pending request; destination clears it and updates confirmed state |
| SW-04 | Reject Run without allocating an engine ID; then send result | Explicit failed state, cleared command, null engine ID, and stored result |
| SW-05 / completed, failed, cancelled | Reach a terminal state with Pause pending; create another execution | Terminal outcome clears pending command; new run/correlation can be inserted |
| SW-06 | Engine rejects Pause | State stays running; pending action clears; decision and command reason are saved |
| SW-07 | Send and replay heartbeat with progress | Health observations persist; replay does not refresh receipt time; execution state and response sequence stay unchanged |
| SW-08 | Database succeeds but Kafka offset commit fails; restart consumer | Data survives; record remains unacknowledged until replay; replay is a no-op and then commits |
| SW-09 / missing correlation, engine conflict, invalid sequence, invalid lifecycle status | Send invalid identity/contract data | No state writes and no offset commit |
| SW-10 | Reuse an applied sequence with a changed payload | Contract violation; state preserved; offset not committed |
| SW-11 | Insert another run while one is active | Database rejects overlapping execution |
| SW-12 | Deliver results for an old failed run after selecting a new run | Results update only the old execution; current scenario remains running |
| SW-13 | Force scenario write failure during terminal processing; repair database and restart | Run and receipt insert roll back together; offset stays pending; retry succeeds after repair |
| SW-14 | Send acknowledgement for an older command sequence | Newer pending request stays unchanged; stale acknowledgement rejected |
| SW-15 | Deliver result before its missing terminal-status event | Result held; terminal state remains unknown; arrival of missing status drains result in order |
| SW-16 | Malformed JSON precedes a valid record on one partition | Neither offset advances past the poison record; no orphan/state change |
| SW-17 / current run or execution parent | Reference a run owned by another scenario | Database rejects cross-scenario links |
| SW-18 | Duplicate a correlation ID or link an execution to itself | Database rejects both invalid identities |
| SW-19 | Terminal state carries an older command reference | Execution closes and pending request clears without recording the newer command as successful |


| SW-20 / emulator, simulator | Seed pending Run; accept without engine ID; report setup-ready with access metadata; report running | Run remains pending through setup; later ID binds and survives omission; access metadata/build receipt are preserved; running clears Run |
| SW-21 / pause, resume, cancel | Reject the matching pending request while an execution reason already exists | Confirmed state and execution reason remain unchanged; command reason/decision are stored; request clears |
| SW-22 | Report the requested destination without command identity, then with matching identity and null decision | Unrelated status does not clear the command; matching completion does |
| SW-23 | Send resuming and then running for pending Resume | Resuming retains pending command and paused scenario; running clears it |
| SW-24 / run, resume, cancel × completed, failed, cancelled | End an execution while each action is pending | All nine combinations clear pending action and record terminal state without fabricating an accepted decision |
| SW-25 | Pause, resume, request another Pause, then redeliver the old exact Pause response | Old receipt is a no-op; newer request remains pending until its own response |
| SW-26 / different action, future command, rejection changing state | Send a response that conflicts with the pending action or attempts to change state through rejection | Run, scenario, receipts and Kafka offset remain unchanged |
| SW-27 | Send a valid event for an unregistered correlation | Unknown-correlation rejection; no orphan run or receipt |
| SW-28 | Bind engine ID, attempt replacement, then omit it in later status and result | Replacement rejected; omission accepted without erasing binding |
| SW-29 / invalid envelope variants | Send each invalid identity, timestamp, sequence, command, decision, URL or extra field listed below | Classified rejection; run, scenario and receipt ledger unchanged; offset not committed |
| SW-30 / null body, empty body, malformed JSON, JSON null, array, empty object | Send malformed/empty records | No run or receipt writes; record stays uncommitted |
| SW-31 | Hold several future events with multiple missing ranges; repair one prefix at a time | Each contiguous prefix applies; recovery flag remains until all gaps close; final result is stored |
| SW-32 | Repeat an identical held event, then change its payload | Exact repeat keeps one receipt; changed payload rejected; original event still replays after repair |
| SW-33 | Hold four events; make scenario update fail during repair; remove fault and restart | Entire replay rolls back including repair receipt; held records survive; retry applies all six sequences and final result |
| SW-34 | Higher sequences have older producer timestamps, including the result | Sequence wins; timestamps do not suppress state/result; completion timestamp remains the terminal event's timestamp |
| SW-35 / active result, cancelled result, terminal reopening, conflicting terminal, stage regression | Send each contradictory event at the next sequence | No changes to run, scenario, receipts or offset |
| SW-36 | Send a second final result with a new sequence | Original result is retained; conflicting new result rejected |
| SW-37 / removed status, removed verdict, missing results, array results, null results | Send invalid result payloads after completion | Validation rejects actual result events; terminal state/result receipt remain untouched |
| SW-38 | Send failure with an unfamiliar reason followed by empty JSON results | Both are valid; reason and result arrival are recorded |
| SW-39 | After completion, redeliver the original accepted event | Verified duplicate cannot reopen execution or add a receipt |
| SW-40 | With Pause pending, send health, older health, then newer progress | Older observation changes nothing; newer health advances observations but preserves command, lifecycle and response sequence |
| SW-41 / completed, failed, cancelled | Send fresh health after termination | Observation acknowledged without any execution mutation |
| SW-42 / array progress, status-counter field on health | Send health fields outside the current accepted contract | Rejected without refreshing health; heartbeat sequence scope remains an engine contract TODO |
| SW-43 | Two independent consumers contend on one locked run, then receive duplicate and out-of-order events | Locking serializes changes; both groups acknowledge; only three receipts exist; repaired state and scenario agree |

| SW-44 | Committed-offset observation receives temporary Kafka coordinator errors 14, 15 and 16 | Retry the observation within the existing deadline; then confirm real persistence and offset advancement |
| SW-45 | A rejected record's offset check receives the same coordinator errors | Retry only the read; still prove the record is uncommitted and no state/receipt was stored |
| SW-46 | Run the schema initializer against an already initialized database containing execution data | Rows and receipts remain unchanged; no migration-history table is required; subsequent events still process |
| SW-47 | Run initialization against a partial database containing only scenario data | Fail clearly; preserve existing data and do not create the missing tables |
| SW-48 | Force a type-name conflict during a fresh initialization | Roll back all newly created objects; preserve the pre-existing type |
| SW-49 | Initialize the same fresh database concurrently from two connections | Advisory lock serializes creation; both calls succeed with exactly four complete application tables (`run`, `run_event_inbox`, `run_outbox`, `scenario`) |
| SW-50 | Send a heartbeat for a running current run | Heartbeat fields are stored on the run; the scenario row is not updated at all (row version unchanged) |
| SW-51 | Send accepted, setup_ready, running, then paused for a current run whose scenario is already running | The first three leave the scenario row untouched; only the pause (a real change) updates it to paused |
| SW-52 | Hold sequences 5 and 4 behind a missing 3, then deliver 3 as a terminal failure | 3 commits and is acknowledged (run failed, scenario finished); the held 4 and 5 are invalid after a terminal state, stay stored with recovery still required, and a later valid event is stored and acknowledged instead of blocking the run |

Unit tests supplement this suite with schema validation, command outcomes,
terminal/result rules, timestamp-independent ordering, adapters, shutdown and logging.
The cases above replace earlier expectations for timestamp ordering, API-owned
pausing/cancelling states, verdicts, and results completing an active execution.

## Remaining coverage and implementation boundaries

- Engine recovery API, permanent event loss, automated missing-result checks and alerts
  are not implemented; a missing sequence can currently be repaired by re-delivery.
- Producer sequence persistence, engine capabilities, version negotiation and clock skew
  must be agreed with both engine teams.
- Module tests use real Kafka/PG but do not establish multi-replica rebalance behaviour,
  production security, load capacity, or engine-team compatibility.
- Malformed/unknown events still block the partition. Durable sequence-gap holding is
  not a general DLQ or poison-event recovery implementation.

## Invalid envelope variants (SW-29)

Each variant is a separate test with the same expected outcome: typed rejection,
no run/scenario/receipt change, and no Kafka acknowledgement.

| Variant | Invalid input |
| --- | --- |
| blank correlation | Whitespace-only correlation ID |
| null correlation | Explicit null correlation ID |
| blank engine ID | Supplied engine ID is whitespace-only |
| null engine ID | Supplied engine ID is null; omission is valid and tested separately |
| unknown engine | Engine outside emulator/simulator enum |
| missing event type | No event_type |
| unknown event type | Unsupported event_type |
| bad timestamp | Non-ISO timestamp |
| missing timestamp | No emitted_at |
| negative sequence | Sequence below zero |
| fractional sequence | Non-integer sequence |
| unsafe sequence | Sequence exceeds the safe integer bound |
| missing sequence | No status sequence |
| command without counter | command_id supplied without command_sequence |
| counter without command | command_sequence supplied without command_id |
| decision without command | Decision without correlated command identity |
| unknown command | Action outside run/pause/resume/cancel |
| unknown decision | Decision outside accepted/rejected |
| failure without reason | Failed state without a reason |
| rejection without reason | Rejected command without a reason |
| Run rejection not failed | Rejected Run reports accepted state instead of failed |
| API-owned pausing | Unsupported pausing lifecycle value |
| API-owned cancelling | Unsupported cancelling lifecycle value |
| extra field | Unknown status-envelope property |
| unsafe engine URL | Non-HTTP engine access URL |

## Assertion strength and scope

Rejection helpers compare the complete run row, scenario row and receipt ledger,
then check the consumer group's committed offset. Successful cases assert the
business state and relevant payload/timestamp/sequence values, not acknowledgement
alone. Command APIs still need their own concurrency and one-pending-command tests;
SQL fixture seeding is not an API test.

These cases cover the current implemented worker contract. Engine event retrieval,
permanent-loss policy, missing-result alert timers, real engine interoperability,
broker/DB outage campaigns, load limits and consumer-group rebalance behaviour
remain separate work; no test claims those unimplemented behaviours are complete.

## CI coordinator readiness

A fresh Kafka broker may temporarily answer OffsetFetch with coordinator loading,
unavailability, or not-the-coordinator (codes 14, 15, 16). Offset observation retries
only those Kafka protocol errors within the existing 30-second polling deadline.
Each read rediscovers the coordinator through KafkaJS. Authentication, authorization,
assertion failures and unrelated errors still fail immediately. A permanent coordinator
failure times out with its last error preserved as the cause.

The negative-offset assertion runs after a successful read, outside the retry loop:
a record committed by mistake must still fail the test. Unit regressions verify retry
classification, eventual success, deadline exhaustion, and immediate propagation of
non-coordinator errors. No production event handling or retry policy is changed.


Outbox (trigger → Kafka) module tests are described in [OUTBOX.md](OUTBOX.md).
