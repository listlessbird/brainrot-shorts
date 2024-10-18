CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`google_id` text NOT NULL,
	`picture` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`speech_url` text NOT NULL,
	`captions_url` text NOT NULL,
	`video_url` text,
	`images` text DEFAULT [] NOT NULL,
	`config_id` text NOT NULL,
	`script_id` text NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `config`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`script_id`) REFERENCES `generated_script`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_generations`("id", "created_at", "speech_url", "captions_url", "video_url", "images", "config_id", "script_id") SELECT "id", "created_at", "speech_url", "captions_url", "video_url", "images", "config_id", "script_id" FROM `generations`;--> statement-breakpoint
DROP TABLE `generations`;--> statement-breakpoint
ALTER TABLE `__new_generations` RENAME TO `generations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;