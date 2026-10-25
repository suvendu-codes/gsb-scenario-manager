-- Recreate the enum so a fresh install can add values and set the default in
-- one Drizzle transaction (PostgreSQL forbids using an uncommitted enum ADD VALUE).
DROP INDEX "run_one_active_per_scenario";
--> statement-breakpoint
ALTER TABLE "run" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "run" ALTER COLUMN "status" TYPE text USING "status"::text;
--> statement-breakpoint
DROP TYPE "public"."run_status";
--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM ('trigger_requested','accepted','queued','provisioning','setup_ready','running','paused','resuming','completed','failed','interrupted','cancelled');
--> statement-breakpoint
ALTER TABLE "run" ALTER COLUMN "status" TYPE "public"."run_status" USING "status"::"public"."run_status";
--> statement-breakpoint
CREATE UNIQUE INDEX "run_one_active_per_scenario" ON "run" ("scenario_id") WHERE "status" NOT IN ('completed','failed','interrupted','cancelled');
--> statement-breakpoint
CREATE TABLE "run_event_inbox" (
	"run_id" uuid NOT NULL,
	"sequence" bigint NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_event_inbox_run_id_sequence_pk" PRIMARY KEY("run_id","sequence")
);
--> statement-breakpoint
ALTER TABLE "run" ALTER COLUMN "status" SET DEFAULT 'trigger_requested';--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "pending_command" text;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "command_sequence" bigint;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "decision" text;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "command_reason" text;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "last_event_sequence" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "recovery_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "heartbeat_emitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "heartbeat_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "progress" jsonb;--> statement-breakpoint
ALTER TABLE "run_event_inbox" ADD CONSTRAINT "run_event_inbox_run_id_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_command_enum" CHECK ("run"."pending_command" IS NULL OR "run"."pending_command" IN ('run','pause','resume','cancel'));--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_decision_enum" CHECK ("run"."decision" IS NULL OR "run"."decision" IN ('accepted','rejected'));--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_command_sequence_valid" CHECK ("run"."command_sequence" IS NULL OR "run"."command_sequence" BETWEEN 1 AND 9007199254740991);--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_pending_command_identity" CHECK ("run"."pending_command" IS NULL OR "run"."command_sequence" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_event_sequence_valid" CHECK ("run"."last_event_sequence" BETWEEN 0 AND 9007199254740991);
