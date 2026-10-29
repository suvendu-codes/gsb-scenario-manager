-- Outbox for SM -> engine commands (run.trigger now; pause/resume/cancel reuse the same table).
-- Hand-written: enum value additions must not be used inside this migration's transaction.

-- 1. Align scenario_status with the application enum (draft, running, paused, finished).
--    0000_init created ('draft', 'active', 'completed'); databases created by `drizzle-kit push`
--    already have the new values, so every step is guarded.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'scenario_status' AND e.enumlabel = 'active') THEN
    ALTER TYPE "public"."scenario_status" RENAME VALUE 'active' TO 'running';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
             WHERE t.typname = 'scenario_status' AND e.enumlabel = 'completed') THEN
    ALTER TYPE "public"."scenario_status" RENAME VALUE 'completed' TO 'finished';
  END IF;
END $$;--> statement-breakpoint
ALTER TYPE "public"."scenario_status" ADD VALUE IF NOT EXISTS 'paused' BEFORE 'finished';--> statement-breakpoint

-- 2. Run lifecycle values from the Event Schema Proposal.
ALTER TYPE "public"."run_status" ADD VALUE IF NOT EXISTS 'trigger_requested';--> statement-breakpoint
ALTER TYPE "public"."run_status" ADD VALUE IF NOT EXISTS 'resuming';--> statement-breakpoint

-- 3. New enums.
CREATE TYPE "public"."run_command" AS ENUM('run', 'pause', 'resume', 'cancel');--> statement-breakpoint
CREATE TYPE "public"."run_priority" AS ENUM('high', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'published', 'dead');--> statement-breakpoint

-- 4. Command bookkeeping on run.
ALTER TABLE "run" ADD COLUMN "priority" "run_priority" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "pending_command" "run_command";--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "command_sequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "issued_by" text;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "request_hash" text;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_scenario_idempotency_key" UNIQUE("scenario_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_command_sequence_valid" CHECK ("run"."command_sequence" >= 0);--> statement-breakpoint
-- Fails if a scenario already has two nonterminal runs; resolve those rows first.
CREATE UNIQUE INDEX "run_one_active_per_scenario" ON "run" USING btree ("scenario_id") WHERE "run"."status" NOT IN ('completed', 'failed', 'cancelled', 'interrupted');--> statement-breakpoint

-- 5. The outbox.
CREATE TABLE "run_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"correlation_id" text NOT NULL,
	"engine" "run_engine" NOT NULL,
	"event_type" text NOT NULL,
	"command_id" "run_command" NOT NULL,
	"sequence" integer NOT NULL,
	"topic" text NOT NULL,
	"message_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "run_outbox_correlation_sequence_key" UNIQUE("correlation_id","sequence"),
	CONSTRAINT "run_outbox_sequence_valid" CHECK ("run_outbox"."sequence" > 0),
	CONSTRAINT "run_outbox_attempts_valid" CHECK ("run_outbox"."attempts" >= 0),
	CONSTRAINT "run_outbox_published_consistent" CHECK (("run_outbox"."status" = 'published') = ("run_outbox"."published_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "run_outbox" ADD CONSTRAINT "run_outbox_scenario_id_scenario_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_outbox" ADD CONSTRAINT "run_outbox_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_outbox_due_idx" ON "run_outbox" USING btree ("available_at","created_at") WHERE "run_outbox"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "run_outbox_run_idx" ON "run_outbox" USING btree ("run_id");
