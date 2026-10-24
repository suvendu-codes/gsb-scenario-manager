# Status worker module test guide

This guide explains every executable module test in plain language. Test IDs
match the names in [status-worker.module.ts](./status-worker.module.ts) and the
saved test report. A row with a suffix is an individual test, not a future idea.

## What these tests run

The suite starts real PostgreSQL and Kafka in an isolated Docker project, applies
the actual migrations, and uses the production worker, event parser, lifecycle
rules, Kafka adapter, and PostgreSQL repository. Most successful-event checks use
the separately running worker container. Failure/restart and separate-topic checks
start additional instances of the same worker classes in the test process with
real Kafka consumers and the same real database.

Each test creates its own execution fixtures. Invalid messages use their own
Kafka topics and groups, so one rejected event cannot block other tests. Automatic
consumer crash restarts are disabled only for these isolated test consumers so
rejection and recovery can be inspected deterministically. Production retry
settings are unchanged. Database constraint fixtures are rolled back; all other
fixtures disappear when the test project's volumes are removed.

A correlation ID connects an event to its registered run. The engine execution ID
identifies the execution inside the emulator/simulator. Acknowledgement means the
worker has committed the next Kafka offset after persistence; Kafka can then
resume after that event. An ignored event is valid but makes no change and is
still acknowledged. A rejected event is not acknowledged and requires correction
or operator intervention; no discard or dead-letter behavior is assumed.

## Cases and expected results

There are **69 executable cases** across 28 test families.

| Test ID | What we do | Expected result |
| --- | --- | --- |
| `SW-01` | Run a complete failed execution, create a separate retry, deliver late events for the old run, pause/resume the retry, and replay its result. | The old run stays failed and receives its own late results. The retry completes, its scenario finishes, and the duplicate result is acknowledged. |
| `SW-02/accepted` | Send a accepted status for a registered run. | The run stores accepted, the engine execution ID, and the event time. The scenario becomes running. A completion time exists only for a finished execution. |
| `SW-02/queued` | Send a queued status for a registered run. | The run stores queued, the engine execution ID, and the event time. The scenario becomes running. A completion time exists only for a finished execution. |
| `SW-02/provisioning` | Send a provisioning status for a registered run. | The run stores provisioning, the engine execution ID, and the event time. The scenario becomes running. A completion time exists only for a finished execution. |
| `SW-02/setup_ready` | Send a setup_ready status for a registered run. | The run stores setup_ready, the engine execution ID, and the event time. The scenario becomes running. A completion time exists only for a finished execution. |
| `SW-02/running` | Send a running status for a registered run. | The run stores running, the engine execution ID, and the event time. The scenario becomes running. A completion time exists only for a finished execution. |
| `SW-02/paused` | Send a paused status for a registered run. | The run stores paused, the engine execution ID, and the event time. The scenario becomes paused. A completion time exists only for a finished execution. |
| `SW-02/completed` | Send a completed status for a registered run. | The run stores completed, the engine execution ID, and the event time. The scenario becomes finished. A completion time exists only for a finished execution. |
| `SW-02/failed` | Send a failed status for a registered run. | The run stores failed, the engine execution ID, and the event time. The scenario becomes finished. A completion time exists only for a finished execution. |
| `SW-02/interrupted` | Send a interrupted status for a registered run. | The run stores interrupted, the engine execution ID, and the event time. The scenario becomes finished. A completion time exists only for a finished execution. |
| `SW-02/cancelled` | Send a cancelled status for a registered run. | The run stores cancelled, the engine execution ID, and the event time. The scenario becomes finished. A completion time exists only for a finished execution. |
| `SW-03` | Send running, paused, then running. | Both run and scenario follow each change, confirming that pause/resume is allowed. |
| `SW-04` | Send setup URLs, followed by a failure reason and message. | Both URLs and the exact failure reason/message are stored; later events do not erase omitted setup details. |
| `SW-05/success` | Send a success result containing nested JSON, arrays, null, and empty objects. | The run becomes completed with verdict success; its scenario becomes finished. The full JSON and result/completion times are stored. A failure verdict is a result assessment, not a failed lifecycle status. |
| `SW-05/failure` | Send a failure result containing nested JSON, arrays, null, and empty objects. | The run becomes completed with verdict failure; its scenario becomes finished. The full JSON and result/completion times are stored. A failure verdict is a result assessment, not a failed lifecycle status. |
| `SW-05/inconclusive` | Send a inconclusive result containing nested JSON, arrays, null, and empty objects. | The run becomes completed with verdict inconclusive; its scenario becomes finished. The full JSON and result/completion times are stored. A failure verdict is a result assessment, not a failed lifecycle status. |
| `SW-06/completed` | After the run is completed, send running and a different finished status. | The entire run record stays unchanged, including its completed outcome and original completion time. The events are acknowledged and the scenario stays finished. |
| `SW-07/completed` | After the run is completed, deliver a result with a failure verdict. | The result JSON and verdict are saved. The lifecycle remains completed, and the original completion time is preserved. |
| `SW-06/failed` | After the run is failed, send running and a different finished status. | The entire run record stays unchanged, including its failed outcome and original completion time. The events are acknowledged and the scenario stays finished. |
| `SW-07/failed` | After the run is failed, deliver a result with a failure verdict. | The result JSON and verdict are saved. The lifecycle remains failed, and the original completion time is preserved. |
| `SW-06/interrupted` | After the run is interrupted, send running and a different finished status. | The entire run record stays unchanged, including its interrupted outcome and original completion time. The events are acknowledged and the scenario stays finished. |
| `SW-07/interrupted` | After the run is interrupted, deliver a result with a failure verdict. | The result JSON and verdict are saved. The lifecycle remains interrupted, and the original completion time is preserved. |
| `SW-06/cancelled` | After the run is cancelled, send running and a different finished status. | The entire run record stays unchanged, including its cancelled outcome and original completion time. The events are acknowledged and the scenario stays finished. |
| `SW-07/cancelled` | After the run is cancelled, deliver a result with a failure verdict. | The result JSON and verdict are saved. The lifecycle remains cancelled, and the original completion time is preserved. |
| `SW-08/duplicate` | Resend the exact running status. | The event is acknowledged, but neither the run nor the scenario changes, including their update timestamps. |
| `SW-08/older` | Send an older paused status after running. | The event is acknowledged, but neither the run nor the scenario changes, including their update timestamps. |
| `SW-08/equal-time-conflict` | Send paused with the same timestamp as the running status. | The event is acknowledged, but neither the run nor the scenario changes, including their update timestamps. |
| `SW-08/stage-regression` | Send provisioning with a newer timestamp after running. | The event is acknowledged, but neither the run nor the scenario changes, including their update timestamps. |
| `SW-09/duplicate` | Resend the exact result. | The event is acknowledged and the complete run record, including results and verdict, remains unchanged. |
| `SW-09/older` | Send a conflicting result with an older timestamp. | The event is acknowledged and the complete run record, including results and verdict, remains unchanged. |
| `SW-09/equal-time-conflict` | Send a conflicting result with the same timestamp. | The event is acknowledged and the complete run record, including results and verdict, remains unchanged. |
| `SW-10` | Send an initial result, then a newer result with replacement metrics and an inconclusive verdict. | Metrics and verdict are replaced. The first completion time is preserved. |
| `SW-11` | Deliver a completed status, followed by a result whose emission time is earlier than that status. | The result is stored because status and result ordering are tracked separately. The completion time remains unchanged. |
| `SW-12` | Deliver a result before any status, then deliver running. | The result completes the run. The later status is acknowledged without reopening or modifying it. |
| `SW-13` | Register a simulator run, then send running and a successful result. | The simulator identity is retained and the execution completes using the same rules as emulator runs. |
| `SW-14` | Clear the current-run selection, then deliver a result for an existing run. | The run completes, but the scenario record stays entirely unchanged. |
| `SW-15` | Send a failure for one scenario and a pause for another scenario with overlapping requests. | Each run and scenario receives only its own status: failed/finished for the first, paused/paused for the second. |
| `SW-16` | Use separate Kafka topics for a running status and a successful result, with overlapping delivery. | Both messages are acknowledged. The final run is completed with a success verdict and its scenario is finished, regardless of arrival order. |
| `SW-17/malformed-json` | Send broken JSON text. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/null-body` | Send an event with no body. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/unknown-type` | Send a run.heartbeat event, which is not implemented. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/missing-correlation` | Omit the correlation ID. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/invalid-status` | Send the unsupported resuming status. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/invalid-timestamp` | Use yesterday instead of a valid event timestamp. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/unexpected-field` | Add the currently unsupported sequence field. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/invalid-engine` | Use an unknown engine name. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/invalid-url` | Include a file URL as the engine instance URL. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-17/invalid-result` | Use an array instead of the required result object. | The consumer rejects the message. Its offset is not acknowledged, and neither the run nor the scenario changes. |
| `SW-18/engine` | Send a simulator response for an emulator run. | The consumer rejects the response without acknowledgement; the registered run remains entirely unchanged. |
| `SW-18/engine-run-id` | After the engine execution ID is bound, send a response with a different execution ID. | The consumer rejects the response without acknowledgement; the registered run remains entirely unchanged. |
| `SW-19` | Send an unknown correlation ID, inspect the failure, register that ID on the fixture run, and restart the consumer with the same group. | The event initially creates no run and remains unacknowledged. After registration, the retained event is replayed, persisted as running, and acknowledged. |
| `SW-20` | Force the first offset commit to fail after a real result has been saved, then restart the consumer with the same group. | The completed run and result remain saved while the message is unacknowledged. Replay is acknowledged without changing the saved record. |
| `SW-21` | Temporarily make PostgreSQL reject a scenario pause update, send paused, then remove the restriction and restart the consumer. | The initial failure rolls back both run and scenario changes and leaves the event unacknowledged. After repair, replay pauses both records and is acknowledged. |
| `SW-22` | Save and acknowledge running, stop the consumer, restart with the same group, and send paused. | The restarted consumer receives only the new offset, without redelivering the already acknowledged running event. Both run and scenario end paused and the new event is acknowledged. |
| `SW-23/accepted` | While a run is accepted, insert a second active run for that scenario. | PostgreSQL rejects the insert with a uniqueness violation. Paused runs also reserve the active execution slot. |
| `SW-23/queued` | While a run is queued, insert a second active run for that scenario. | PostgreSQL rejects the insert with a uniqueness violation. Paused runs also reserve the active execution slot. |
| `SW-23/provisioning` | While a run is provisioning, insert a second active run for that scenario. | PostgreSQL rejects the insert with a uniqueness violation. Paused runs also reserve the active execution slot. |
| `SW-23/setup_ready` | While a run is setup_ready, insert a second active run for that scenario. | PostgreSQL rejects the insert with a uniqueness violation. Paused runs also reserve the active execution slot. |
| `SW-23/running` | While a run is running, insert a second active run for that scenario. | PostgreSQL rejects the insert with a uniqueness violation. Paused runs also reserve the active execution slot. |
| `SW-23/paused` | While a run is paused, insert a second active run for that scenario. | PostgreSQL rejects the insert with a uniqueness violation. Paused runs also reserve the active execution slot. |
| `SW-24/completed` | After the previous run is completed, insert a new run linked to it as a retry. | PostgreSQL accepts the new run and preserves the link to the previous execution. |
| `SW-24/failed` | After the previous run is failed, insert a new run linked to it as a retry. | PostgreSQL accepts the new run and preserves the link to the previous execution. |
| `SW-24/interrupted` | After the previous run is interrupted, insert a new run linked to it as a retry. | PostgreSQL accepts the new run and preserves the link to the previous execution. |
| `SW-24/cancelled` | After the previous run is cancelled, insert a new run linked to it as a retry. | PostgreSQL accepts the new run and preserves the link to the previous execution. |
| `SW-25/current-run` | Point one scenario at another scenario's run. | PostgreSQL rejects the cross-scenario current-run reference. |
| `SW-25/retry-parent` | Insert a retry whose parent run belongs to another scenario. | PostgreSQL rejects the cross-scenario retry reference. |
| `SW-26` | Set a run as its own retry parent. | PostgreSQL rejects the self-reference. |
| `SW-27` | Insert a run in a different scenario using an existing correlation ID. | PostgreSQL rejects the duplicate correlation ID, keeping event lookup unambiguous. |

| `SW-28` | Place a malformed record before a valid running event in the same partition. | The consumer rejects the first record. Neither offset is acknowledged, and the run remains unchanged; later records cannot bypass the rejected record. |

## How to run and read results

From the repository root, with Docker running:

```sh
pnpm test:module
```

The runner builds the image, starts fresh infrastructure, executes the tests, and
collects reports before removing the temporary stack. It does not change the
persistent local demo stack. The generated image stays in Docker's build cache.

Find the output in `test-results/module/<unique-id>/`:

- `tests.tap`: each test ID, pass/fail outcome, and assertion failures.
- `build.log` and `startup.log`: image-build and infrastructure startup output.
- `infrastructure.log`: worker, Kafka, and PostgreSQL logs.
- `containers.log`: container state before cleanup.
- `cleanup.log`: removal of the isolated containers, network, and volumes.
- `project.txt`: the project's name, useful if interrupted cleanup needs repair.

A successful run reports zero failures. A failed assertion, startup problem, or
cleanup failure returns a nonzero exit code. The CI module job uses the same
runner and uploads its reports even after failure. Database state and committed
offsets are checked with bounded polling rather than assuming that a fixed sleep
means processing finished. Consumer rejection tests intentionally produce error
logs; their expected result is a passing test confirming that the event was not
acknowledged and data was protected.

## Scope and remaining gaps

This is broad coverage of the currently implemented worker contract, not proof of
every possible failure or production topology. The tests seed scenario/run rows
directly; they do not test trigger creation or outbox publishing. The offset-commit
failure is injected at the Kafka client boundary; it is not a simulated broker
network outage. The database failure uses a temporary constraint; it does not
simulate an entire PostgreSQL outage. Separate-topic delivery checks exercise
serialization but do not exhaustively enumerate all timing interleavings.

Still separate work: multi-broker failover, multiple production worker replicas
and group rebalances under load, prolonged database/broker outages, deployment
shutdown during in-flight work, performance limits, authentication/TLS, retained
history migration from production datasets, and automatic KafkaJS backoff/restart
timing. Sequence-based ordering, heartbeat/progress events, health evaluation,
and alerting are planned features and have no positive module tests yet.
`SW-17` explicitly verifies that currently unsupported events/fields are rejected;
update those tests when the contract is implemented.

Keep this guide updated alongside test changes: new tests need a stable ID,
plain-language steps, and an expected result. Existing unit tests remain useful
for detailed parser, configuration, adapter, and lifecycle combinations.
