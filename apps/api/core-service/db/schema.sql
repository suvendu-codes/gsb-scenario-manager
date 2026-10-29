-- Single baseline for fresh Scenario Manager development and CI databases.
-- No versioned migrations, backfills, destructive resets, or data conversion.
-- Re-running validates an existing baseline without changing application data.
BEGIN;
SET LOCAL search_path TO public;
-- Serialize simultaneous initializers; transaction rollback leaves no partial schema.
SELECT pg_advisory_xact_lock(hashtext('scenario-manager-fresh-schema'));
DO $bootstrap$
BEGIN
  IF to_regclass('public.scenario') IS NOT NULL OR to_regclass('public.run') IS NOT NULL
     OR to_regclass('public.run_event_inbox') IS NOT NULL OR to_regclass('public.run_outbox') IS NOT NULL THEN
    IF to_regclass('public.scenario') IS NULL OR to_regclass('public.run') IS NULL
       OR to_regclass('public.run_event_inbox') IS NULL OR to_regclass('public.run_outbox') IS NULL THEN
      RAISE EXCEPTION 'Partial Scenario Manager schema. Use a fresh database; existing tables are not modified.';
    END IF;
    -- Validate columns, enum values and safety constraints before accepting a no-op.
    PERFORM "id", "correlation_id", "run_id", "scenario_id", "retry_of_run_id", "engine", "status", "verdict", "pending_command", "command_sequence", "decision", "command_reason", "last_event_sequence", "recovery_required", "heartbeat_emitted_at", "heartbeat_received_at", "progress", "reason", "results", "engine_ref", "status_message", "status_event_at", "result_event_at", "priority", "triggered_by", "map_version", "sizer_version", "config_snapshot_uri", "idempotency_key", "request_hash", "created_at", "updated_at", "completed_at" FROM public."run" LIMIT 0;
    PERFORM "id", "name", "project_id", "map_id", "solution_id", "status", "current_run_id", "config", "inbound_uri", "outbound_uri", "masterdata_uri", "mockput_uri", "author_id", "created_at", "updated_at" FROM public."scenario" LIMIT 0;
    PERFORM "run_id", "sequence", "payload", "received_at" FROM public."run_event_inbox" LIMIT 0;
    PERFORM "id", "scenario_id", "run_id", "correlation_id", "engine", "event_type", "command_id", "sequence", "topic", "message_key", "payload", "headers", "status", "attempts", "available_at", "locked_by", "locked_until", "last_error", "created_at", "published_at" FROM public."run_outbox" LIMIT 0;
    IF ARRAY(SELECT enumlabel::text FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='run_engine'
      ORDER BY enumsortorder) IS DISTINCT FROM ARRAY['emulator', 'simulator']::text[] THEN
      RAISE EXCEPTION 'Existing run_engine differs from the fresh schema. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF ARRAY(SELECT enumlabel::text FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='run_status'
      ORDER BY enumsortorder) IS DISTINCT FROM ARRAY['trigger_requested', 'accepted', 'queued', 'provisioning', 'setup_ready', 'running', 'paused', 'resuming', 'completed', 'failed', 'interrupted', 'cancelled']::text[] THEN
      RAISE EXCEPTION 'Existing run_status differs from the fresh schema. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF ARRAY(SELECT enumlabel::text FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='run_verdict'
      ORDER BY enumsortorder) IS DISTINCT FROM ARRAY['success', 'failure', 'inconclusive']::text[] THEN
      RAISE EXCEPTION 'Existing run_verdict differs from the fresh schema. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF ARRAY(SELECT enumlabel::text FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
      JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='scenario_status'
      ORDER BY enumsortorder) IS DISTINCT FROM ARRAY['draft', 'running', 'paused', 'finished']::text[] THEN
      RAISE EXCEPTION 'Existing scenario_status differs from the fresh schema. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_command_enum') THEN
      RAISE EXCEPTION 'Existing schema is missing run_command_enum. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_decision_enum') THEN
      RAISE EXCEPTION 'Existing schema is missing run_decision_enum. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_command_sequence_valid') THEN
      RAISE EXCEPTION 'Existing schema is missing run_command_sequence_valid. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_pending_command_identity') THEN
      RAISE EXCEPTION 'Existing schema is missing run_pending_command_identity. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_event_sequence_valid') THEN
      RAISE EXCEPTION 'Existing schema is missing run_event_sequence_valid. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_retry_not_self') THEN
      RAISE EXCEPTION 'Existing schema is missing run_retry_not_self. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_scenario_id_scenario_id_fk') THEN
      RAISE EXCEPTION 'Existing schema is missing run_scenario_id_scenario_id_fk. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_retry_same_scenario_fk') THEN
      RAISE EXCEPTION 'Existing schema is missing run_retry_same_scenario_fk. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_correlation_id_key') THEN
      RAISE EXCEPTION 'Existing schema is missing run_correlation_id_key. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_scenario_id_id_key') THEN
      RAISE EXCEPTION 'Existing schema is missing run_scenario_id_id_key. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.scenario'::regclass AND conname='scenario_current_run_same_scenario_fk') THEN
      RAISE EXCEPTION 'Existing schema is missing scenario_current_run_same_scenario_fk. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_event_inbox'::regclass AND conname='run_event_inbox_run_id_run_id_fk') THEN
      RAISE EXCEPTION 'Existing schema is missing run_event_inbox_run_id_run_id_fk. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_event_inbox'::regclass AND conname='run_event_inbox_run_id_sequence_pk') THEN
      RAISE EXCEPTION 'Existing schema is missing run_event_inbox_run_id_sequence_pk. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_priority_enum') THEN
      RAISE EXCEPTION 'Existing schema is missing run_priority_enum. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run'::regclass AND conname='run_scenario_idempotency_key') THEN
      RAISE EXCEPTION 'Existing schema is missing run_scenario_idempotency_key. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_outbox'::regclass AND conname='run_outbox_correlation_sequence_key') THEN
      RAISE EXCEPTION 'Existing schema is missing run_outbox_correlation_sequence_key. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_outbox'::regclass AND conname='run_outbox_command_enum') THEN
      RAISE EXCEPTION 'Existing schema is missing run_outbox_command_enum. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_outbox'::regclass AND conname='run_outbox_status_enum') THEN
      RAISE EXCEPTION 'Existing schema is missing run_outbox_status_enum. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_outbox'::regclass AND conname='run_outbox_published_consistent') THEN
      RAISE EXCEPTION 'Existing schema is missing run_outbox_published_consistent. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.run_outbox'::regclass AND conname='run_outbox_run_id_run_id_fk') THEN
      RAISE EXCEPTION 'Existing schema is missing run_outbox_run_id_run_id_fk. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='run_one_active_per_scenario' AND i.indisunique AND i.indisvalid) THEN
      RAISE EXCEPTION 'Existing schema is missing unique index run_one_active_per_scenario. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='scenario_map_name_unique' AND i.indisunique AND i.indisvalid) THEN
      RAISE EXCEPTION 'Existing schema is missing unique index scenario_map_name_unique. Use a fresh database; no automatic conversion is performed.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='scenario_one_draft_per_map' AND i.indisunique AND i.indisvalid) THEN
      RAISE EXCEPTION 'Existing schema is missing unique index scenario_one_draft_per_map. Use a fresh database; no automatic conversion is performed.';
    END IF;
    RETURN;
  END IF;

  CREATE TYPE scenario_status AS ENUM ('draft', 'running', 'paused', 'finished');
  CREATE TYPE run_status AS ENUM (
    'trigger_requested', 'accepted', 'queued', 'provisioning', 'setup_ready', 'running', 'paused', 'resuming',
    'completed', 'failed', 'interrupted', 'cancelled'
  );
  CREATE TYPE run_verdict AS ENUM ('success', 'failure', 'inconclusive');
  CREATE TYPE run_engine AS ENUM ('emulator', 'simulator');

  -- project_id / map_id / solution_id reference upstream services (not FKs).
  CREATE TABLE scenario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    project_id      TEXT NOT NULL,
    map_id          TEXT NOT NULL,
    solution_id     TEXT,
    current_run_id  UUID,
    status          scenario_status NOT NULL DEFAULT 'draft',
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    inbound_uri     TEXT,
    outbound_uri    TEXT,
    masterdata_uri  TEXT,
    mockput_uri     TEXT,
    author_id       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX scenario_map_idx ON scenario(project_id, map_id);
  CREATE UNIQUE INDEX scenario_map_name_unique ON scenario(map_id, name);
  CREATE UNIQUE INDEX scenario_one_draft_per_map ON scenario(project_id, map_id) WHERE status = 'draft';

  CREATE TABLE run (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id  TEXT NOT NULL UNIQUE,            -- SM handle sent on trigger; idempotency key
    run_id          TEXT,                            -- optional engine id, bound when first supplied
    scenario_id     UUID NOT NULL CONSTRAINT run_scenario_id_scenario_id_fk REFERENCES scenario(id),
    retry_of_run_id UUID,
    engine          run_engine NOT NULL,
    status          run_status NOT NULL DEFAULT 'trigger_requested',
    verdict         run_verdict,                    -- legacy read-only field
    pending_command TEXT CONSTRAINT run_command_enum CHECK (pending_command IS NULL OR pending_command IN ('run','pause','resume','cancel')),
    command_sequence BIGINT CONSTRAINT run_command_sequence_valid CHECK (command_sequence IS NULL OR command_sequence BETWEEN 1 AND 9007199254740991),
    decision TEXT CONSTRAINT run_decision_enum CHECK (decision IS NULL OR decision IN ('accepted','rejected')),
    command_reason TEXT,
    last_event_sequence BIGINT NOT NULL DEFAULT 0 CONSTRAINT run_event_sequence_valid CHECK (last_event_sequence BETWEEN 0 AND 9007199254740991),
    recovery_required BOOLEAN NOT NULL DEFAULT false,
    heartbeat_emitted_at TIMESTAMPTZ,
    heartbeat_received_at TIMESTAMPTZ,
    progress JSONB,
    reason          TEXT,                            -- failure reason from a failed status event
    results         JSONB NOT NULL DEFAULT '{}'::jsonb,
    engine_ref      TEXT,
    status_message  TEXT,
    status_event_at TIMESTAMPTZ,
    result_event_at TIMESTAMPTZ,
    priority        TEXT NOT NULL DEFAULT 'normal' CONSTRAINT run_priority_enum CHECK (priority IN ('high','normal','low')),
    triggered_by    TEXT,                            -- acting user at trigger time
    map_version     TEXT,                            -- upstream versions pinned at trigger time
    sizer_version   TEXT,
    config_snapshot_uri TEXT,                        -- create-only blob with the effective config
    idempotency_key TEXT,                            -- client Idempotency-Key of the trigger request
    request_hash    TEXT,                            -- sha256 of the canonical trigger request
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
  );
  CREATE INDEX run_scenario_idx ON run(scenario_id, created_at DESC);
  CREATE INDEX run_status_idx ON run(status);

  ALTER TABLE run ADD CONSTRAINT run_scenario_id_id_key UNIQUE(scenario_id, id);
  ALTER TABLE run ADD CONSTRAINT run_scenario_idempotency_key UNIQUE(scenario_id, idempotency_key);
  ALTER TABLE run ADD CONSTRAINT run_retry_same_scenario_fk FOREIGN KEY (scenario_id, retry_of_run_id) REFERENCES run(scenario_id, id);
  ALTER TABLE run ADD CONSTRAINT run_retry_not_self CHECK (retry_of_run_id IS NULL OR retry_of_run_id <> id);
  ALTER TABLE scenario ADD CONSTRAINT scenario_current_run_same_scenario_fk FOREIGN KEY (id, current_run_id) REFERENCES run(scenario_id, id);
  CREATE UNIQUE INDEX run_one_active_per_scenario ON run(scenario_id)
    WHERE status NOT IN ('completed', 'failed', 'interrupted', 'cancelled');

  ALTER TABLE run ADD CONSTRAINT run_pending_command_identity CHECK (pending_command IS NULL OR command_sequence IS NOT NULL);
  CREATE TABLE run_event_inbox (
    run_id UUID NOT NULL CONSTRAINT run_event_inbox_run_id_run_id_fk REFERENCES run(id), -- internal SM primary key
    sequence BIGINT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT run_event_inbox_run_id_sequence_pk PRIMARY KEY (run_id, sequence)
  );

  -- Transactional outbox for SM -> engine commands. The trigger API inserts the complete wire
  -- event in the same transaction as the run; the outbox worker only delivers it to Kafka.
  CREATE TABLE run_outbox (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id    UUID NOT NULL CONSTRAINT run_outbox_scenario_id_scenario_id_fk REFERENCES scenario(id),
    run_id         UUID NOT NULL CONSTRAINT run_outbox_run_id_run_id_fk REFERENCES run(id),
    correlation_id TEXT NOT NULL,
    engine         run_engine NOT NULL,
    event_type     TEXT NOT NULL,                    -- run.trigger | run.pause | run.resume | run.cancel
    command_id     TEXT NOT NULL CONSTRAINT run_outbox_command_enum CHECK (command_id IN ('run','pause','resume','cancel')),
    sequence       INTEGER NOT NULL CONSTRAINT run_outbox_sequence_valid CHECK (sequence > 0), -- SM command sequence
    topic          TEXT NOT NULL,                    -- engine trigger topic, fixed at enqueue time
    message_key    TEXT NOT NULL,                    -- = correlation_id
    payload        JSONB NOT NULL,                   -- exact Kafka record value
    headers        JSONB NOT NULL DEFAULT '{}'::jsonb,
    status         TEXT NOT NULL DEFAULT 'pending' CONSTRAINT run_outbox_status_enum CHECK (status IN ('pending','published','dead')),
    attempts       INTEGER NOT NULL DEFAULT 0 CONSTRAINT run_outbox_attempts_valid CHECK (attempts >= 0),
    available_at   TIMESTAMPTZ NOT NULL DEFAULT now(), -- earliest next attempt (backoff)
    locked_by      TEXT,                             -- worker holding the lease
    locked_until   TIMESTAMPTZ,                      -- lease expiry; expired leases are reclaimable
    last_error     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at   TIMESTAMPTZ,
    CONSTRAINT run_outbox_correlation_sequence_key UNIQUE (correlation_id, sequence),
    CONSTRAINT run_outbox_published_consistent CHECK ((status = 'published') = (published_at IS NOT NULL))
  );
  CREATE INDEX run_outbox_due_idx ON run_outbox(available_at, created_at) WHERE status = 'pending';
  CREATE INDEX run_outbox_run_idx ON run_outbox(run_id);
END
$bootstrap$;
COMMIT;
