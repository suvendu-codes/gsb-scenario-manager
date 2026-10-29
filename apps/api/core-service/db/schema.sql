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
     OR to_regclass('public.run_event_inbox') IS NOT NULL THEN
    IF to_regclass('public.scenario') IS NULL OR to_regclass('public.run') IS NULL
       OR to_regclass('public.run_event_inbox') IS NULL THEN
      RAISE EXCEPTION 'Partial Scenario Manager schema. Use a fresh database; existing tables are not modified.';
    END IF;
    -- Validate columns, enum values and safety constraints before accepting a no-op.
    PERFORM "id", "correlation_id", "run_id", "scenario_id", "retry_of_run_id", "engine", "status", "verdict", "pending_command", "command_sequence", "decision", "command_reason", "last_event_sequence", "recovery_required", "heartbeat_emitted_at", "heartbeat_received_at", "progress", "reason", "results", "engine_ref", "status_message", "status_event_at", "result_event_at", "created_at", "updated_at", "completed_at" FROM public."run" LIMIT 0;
    PERFORM "id", "name", "project_id", "map_id", "solution_id", "status", "current_run_id", "config", "inbound_uri", "outbound_uri", "masterdata_uri", "mockput_uri", "author_id", "created_at", "updated_at" FROM public."scenario" LIMIT 0;
    PERFORM "run_id", "sequence", "payload", "received_at" FROM public."run_event_inbox" LIMIT 0;
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
  run_id          TEXT,                            -- engine id, set from the first status event
  scenario_id     UUID NOT NULL REFERENCES scenario(id),
  engine          run_engine NOT NULL,
  status          run_status NOT NULL DEFAULT 'accepted',
  verdict         run_verdict,
  reason          TEXT,                            -- failure reason from a failed status event
  results         JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine_ref      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX run_scenario_idx ON run(scenario_id, created_at DESC);
CREATE INDEX run_status_idx ON run(status);

-- project_id / map_id reference upstream services (not FKs).
CREATE TABLE map_bot (
  project_id  TEXT NOT NULL,
  map_id      TEXT NOT NULL,
  type        TEXT NOT NULL,
  name        TEXT NOT NULL,
  image_url   TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT map_bot_project_id_map_id_type_pk PRIMARY KEY (project_id, map_id, type)
);
