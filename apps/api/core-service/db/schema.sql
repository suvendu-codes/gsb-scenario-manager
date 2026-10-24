CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE scenario_status AS ENUM ('draft', 'running', 'paused', 'finished');
CREATE TYPE run_status AS ENUM (
  'accepted', 'queued', 'provisioning', 'setup_ready', 'running', 'paused',
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
  run_id          TEXT,                            -- engine id, set from the first status event
  scenario_id     UUID NOT NULL REFERENCES scenario(id),
  retry_of_run_id UUID,
  engine          run_engine NOT NULL,
  status          run_status NOT NULL DEFAULT 'accepted',
  verdict         run_verdict,
  reason          TEXT,                            -- failure reason from a failed status event
  results         JSONB NOT NULL DEFAULT '{}'::jsonb,
  engine_ref      TEXT,
  status_message  TEXT,
  status_event_at TIMESTAMPTZ,
  result_event_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);
CREATE INDEX run_scenario_idx ON run(scenario_id, created_at DESC);
CREATE INDEX run_status_idx ON run(status);

ALTER TABLE run ADD CONSTRAINT run_scenario_id_id_key UNIQUE(scenario_id, id);
ALTER TABLE run ADD CONSTRAINT run_retry_same_scenario_fk FOREIGN KEY (scenario_id, retry_of_run_id) REFERENCES run(scenario_id, id);
ALTER TABLE run ADD CONSTRAINT run_retry_not_self CHECK (retry_of_run_id IS NULL OR retry_of_run_id <> id);
ALTER TABLE scenario ADD CONSTRAINT scenario_current_run_same_scenario_fk FOREIGN KEY (id, current_run_id) REFERENCES run(scenario_id, id);
CREATE UNIQUE INDEX run_one_active_per_scenario ON run(scenario_id)
  WHERE status NOT IN ('completed', 'failed', 'interrupted', 'cancelled');
