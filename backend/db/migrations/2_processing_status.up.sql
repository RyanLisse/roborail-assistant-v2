CREATE TABLE "document_processing_status" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"user_id" text NOT NULL,
	"current_stage" text NOT NULL,
	"overall_status" text NOT NULL,
	"stages" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"progress_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"estimated_completion_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "document_processing_status" ADD CONSTRAINT "document_processing_status_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processing_status_document_id_idx" ON "document_processing_status" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "processing_status_user_id_idx" ON "document_processing_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "processing_status_overall_status_idx" ON "document_processing_status" USING btree ("overall_status");--> statement-breakpoint
CREATE INDEX "processing_status_current_stage_idx" ON "document_processing_status" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "processing_status_created_at_idx" ON "document_processing_status" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "processing_status_updated_at_idx" ON "document_processing_status" USING btree ("updated_at");