CREATE TYPE "public"."run_engine" AS ENUM('emulator', 'simulator');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('accepted', 'queued', 'provisioning', 'setup_ready', 'running', 'paused', 'completed', 'failed', 'interrupted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."run_verdict" AS ENUM('success', 'failure', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."scenario_status" AS ENUM('draft', 'active', 'completed');--> statement-breakpoint
CREATE TABLE "run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" text NOT NULL,
	"run_id" text,
	"scenario_id" uuid NOT NULL,
	"engine" "run_engine" NOT NULL,
	"status" "run_status" DEFAULT 'accepted' NOT NULL,
	"verdict" "run_verdict",
	"reason" text,
	"results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"engine_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "run_correlation_id_key" UNIQUE("correlation_id")
);
--> statement-breakpoint
CREATE TABLE "scenario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"project_id" text NOT NULL,
	"map_id" text NOT NULL,
	"solution_id" text,
	"status" "scenario_status" DEFAULT 'draft' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inbound_uri" text,
	"outbound_uri" text,
	"masterdata_uri" text,
	"mockput_uri" text,
	"author_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_scenario_id_scenario_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "run_scenario_idx" ON "run" USING btree ("scenario_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "run_status_idx" ON "run" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scenario_map_idx" ON "scenario" USING btree ("project_id","map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_map_name_unique" ON "scenario" USING btree ("map_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_one_draft_per_map" ON "scenario" USING btree ("project_id","map_id") WHERE "scenario"."status" = 'draft';