CREATE TYPE "public"."generation_status" AS ENUM('pending', 'script_ready', 'speech_ready', 'images_ready', 'captions_ready', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"topic" text NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"style" text NOT NULL,
	"user_google_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_script" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"script" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_google_id" text NOT NULL,
	"config_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"speech_url" text,
	"captions_url" text,
	"video_url" text,
	"images" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"config_id" uuid NOT NULL,
	"script_id" uuid,
	"user_google_id" text NOT NULL,
	"status" "generation_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"google_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"picture" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "config" ADD CONSTRAINT "config_user_google_id_user_google_id_fk" FOREIGN KEY ("user_google_id") REFERENCES "public"."user"("google_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_script" ADD CONSTRAINT "generated_script_user_google_id_user_google_id_fk" FOREIGN KEY ("user_google_id") REFERENCES "public"."user"("google_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_script" ADD CONSTRAINT "generated_script_config_id_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generations" ADD CONSTRAINT "generations_config_id_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generations" ADD CONSTRAINT "generations_script_id_generated_script_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."generated_script"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generations" ADD CONSTRAINT "generations_user_google_id_user_google_id_fk" FOREIGN KEY ("user_google_id") REFERENCES "public"."user"("google_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_google_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("google_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
