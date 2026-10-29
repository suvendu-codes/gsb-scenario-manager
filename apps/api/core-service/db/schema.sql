CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE scenario_status AS ENUM ('draft', 'running', 'paused', 'finished');
CREATE TYPE run_status AS ENUM (
  'accepted', 'queued', 'provisioning', 'setup_ready', 'running', 'paused',
  'completed', 'failed', 'interrupted', 'cancelled', 'trigger_requested', 'resuming'
);
CREATE TYPE run_verdict AS ENUM ('success', 'failure', 'inconclusive');
CREATE TYPE run_engine AS ENUM ('emulator', 'simulator');
CREATE TYPE run_command AS ENUM ('run', 'pause', 'resume', 'cancel');
CREATE TYPE run_priority AS ENUM ('high', 'normal', 'low');
CREATE TYPE outbox_status AS ENUM ('pending', 'published', 'dead');

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
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id   TEXT NOT NULL,                  -- SM execution identity; Kafka key both directions
  run_id           TEXT,                           -- engine id, bound from the first status event that carries it
  scenario_id      UUID NOT NULL REFERENCES scenario(id),
  engine           run_engine NOT NULL,
  status           run_status NOT NULL DEFAULT 'accepted',
  verdict          run_verdict,
  reason           TEXT,                           -- failure reason from a failed status event
  results          JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine_ref       TEXT,
  priority         run_priority NOT NULL DEFAULT 'normal',
  pending_command  run_command,                    -- the one unresolved SM command
  command_sequence INTEGER NOT NULL DEFAULT 0,     -- last SM command sequence issued
  issued_by        TEXT,
  idempotency_key  TEXT,                           -- client Idempotency-Key for the trigger request
  request_hash     TEXT,                           -- sha256 of the canonical trigger request
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  CONSTRAINT run_correlation_id_key UNIQUE (correlation_id),
  CONSTRAINT run_scenario_idempotency_key UNIQUE (scenario_id, idempotency_key),
  CONSTRAINT run_command_sequence_valid CHECK (command_sequence >= 0)
);
CREATE INDEX run_scenario_idx ON run(scenario_id, created_at DESC);
CREATE INDEX run_status_idx ON run(status);
CREATE UNIQUE INDEX run_one_active_per_scenario ON run(scenario_id)
  WHERE status NOT IN ('completed', 'failed', 'cancelled', 'interrupted');

-- Transactional outbox: the trigger API inserts the complete wire event in the same
-- transaction as the run; the outbox worker only delivers it to Kafka.
CREATE TABLE run_outbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id     UUID NOT NULL REFERENCES scenario(id),
  run_id          UUID NOT NULL REFERENCES run(id),
  correlation_id  TEXT NOT NULL,
  engine          run_engine NOT NULL,
  event_type      TEXT NOT NULL,                   -- run.trigger | run.pause | run.resume | run.cancel
  command_id      run_command NOT NULL,
  sequence        INTEGER NOT NULL,                -- SM command sequence
  topic           TEXT NOT NULL,                   -- resolved per engine at enqueue time
  message_key     TEXT NOT NULL,                   -- = correlation_id
  payload         JSONB NOT NULL,                  -- the exact event sent on the wire
  headers         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          outbox_status NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,
  available_at    TIMESTAMPTZ NOT NULL DEFAULT now(),  -- earliest next attempt (backoff)
  locked_by       TEXT,                            -- worker holding the lease
  locked_until    TIMESTAMPTZ,                     -- lease expiry; expired leases are reclaimable
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ,
  CONSTRAINT run_outbox_correlation_sequence_key UNIQUE (correlation_id, sequence),
  CONSTRAINT run_outbox_sequence_valid CHECK (sequence > 0),
  CONSTRAINT run_outbox_attempts_valid CHECK (attempts >= 0),
  CONSTRAINT run_outbox_published_consistent CHECK ((status = 'published') = (published_at IS NOT NULL))
);
CREATE INDEX run_outbox_due_idx ON run_outbox(available_at, created_at) WHERE status = 'pending';
CREATE INDEX run_outbox_run_idx ON run_outbox(run_id);
