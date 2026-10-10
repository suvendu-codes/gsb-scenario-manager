
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE scenario_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE run_status AS ENUM (
  'triggering', 'setup_ready', 'running', 'paused', 'completed', 'failed', 'interrupted'
);

CREATE TABLE scenario (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         TEXT NOT NULL,
  map_id             TEXT NOT NULL,
  name               TEXT NOT NULL,
  status             scenario_status NOT NULL DEFAULT 'draft',
  author_id          TEXT NOT NULL,
  current_version    INTEGER NOT NULL DEFAULT 1,
  version            INTEGER NOT NULL DEFAULT 1,   -- optimistic lock counter
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scenario_map_idx ON scenario(project_id, map_id);
CREATE UNIQUE INDEX scenario_map_name_unique ON scenario(map_id, name);

-- Every edit creates a new immutable version; config blob is stored in GCS.
CREATE TABLE scenario_version (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id    UUID NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  config_uri     TEXT NOT NULL,                    -- gs://bucket/path/config.json
  created_by     TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, version_number)
);

-- A run pins the exact scenario version it executes.
CREATE TABLE run (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         UUID NOT NULL REFERENCES scenario(id),
  scenario_version_id UUID NOT NULL REFERENCES scenario_version(id),
  engine              TEXT NOT NULL,               -- trigger topic is per engine
  status              run_status NOT NULL DEFAULT 'triggering',
  idempotency_key     TEXT NOT NULL UNIQUE,
  engine_ref          TEXT,
  results_summary     JSONB,                       -- final KPIs; deep metrics stay in Grafana/Tower
  verdict             TEXT,
  triggered_by        TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);
CREATE INDEX run_scenario_idx ON run(scenario_id, created_at DESC);
CREATE INDEX run_status_idx ON run(status);
