ALTER TABLE "run" ADD COLUMN "status_message" text;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "status_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "run" ADD COLUMN "result_event_at" timestamp with time zone;