-- Reconcile the initial migration's legacy scenario labels with the existing application enum.
DROP INDEX "scenario_one_draft_per_map";--> statement-breakpoint
ALTER TABLE "scenario" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "scenario" ALTER COLUMN "status" TYPE text USING "status"::text;--> statement-breakpoint
DROP TYPE "public"."scenario_status";--> statement-breakpoint
CREATE TYPE "public"."scenario_status" AS ENUM('draft', 'running', 'paused', 'finished');--> statement-breakpoint
ALTER TABLE "scenario" ALTER COLUMN "status" TYPE "public"."scenario_status"
USING (CASE "status" WHEN 'active' THEN 'running' WHEN 'completed' THEN 'finished' ELSE "status" END)::"public"."scenario_status";--> statement-breakpoint
ALTER TABLE "scenario" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_one_draft_per_map" ON "scenario" ("project_id", "map_id") WHERE "status" = 'draft';--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "retry_of_run_id" uuid;--> statement-breakpoint
ALTER TABLE "scenario" ADD COLUMN "current_run_id" uuid;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_scenario_id_id_key" UNIQUE("scenario_id", "id");--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_retry_same_scenario_fk" FOREIGN KEY ("scenario_id", "retry_of_run_id") REFERENCES "run"("scenario_id", "id");--> statement-breakpoint
ALTER TABLE "scenario" ADD CONSTRAINT "scenario_current_run_same_scenario_fk" FOREIGN KEY ("id", "current_run_id") REFERENCES "run"("scenario_id", "id");--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_retry_not_self" CHECK ("retry_of_run_id" IS NULL OR "retry_of_run_id" <> "id");--> statement-breakpoint
-- Intentionally fail on existing overlapping active runs; do not silently close executions.
CREATE UNIQUE INDEX "run_one_active_per_scenario" ON "run" ("scenario_id")
WHERE "status" NOT IN ('completed', 'failed', 'interrupted', 'cancelled');--> statement-breakpoint
-- Prefer the single active run; otherwise select the most recently created historical run.
-- Timestamp ties are broken by id only for this one-time legacy backfill.
WITH chosen AS (
  SELECT DISTINCT ON (scenario_id) scenario_id, id, status
  FROM "run"
  ORDER BY scenario_id,
    (status NOT IN ('completed', 'failed', 'interrupted', 'cancelled')) DESC,
    created_at DESC, id DESC
)
UPDATE "scenario" s SET current_run_id = c.id,
  status = (CASE
    WHEN c.status IN ('completed', 'failed', 'interrupted', 'cancelled') THEN 'finished'
    WHEN c.status = 'paused' THEN 'paused'
    ELSE 'running'
  END)::scenario_status
FROM chosen c WHERE s.id = c.scenario_id;
