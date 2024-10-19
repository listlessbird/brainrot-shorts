CREATE TABLE `config` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`topic` text NOT NULL,
	`duration` integer DEFAULT 30 NOT NULL,
	`style` text NOT NULL,
	`script_id` text,
	`user_google_id` text NOT NULL,
	FOREIGN KEY (`script_id`) REFERENCES `generated_script`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_google_id`) REFERENCES `user`(`google_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generated_script` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`script` text DEFAULT [] NOT NULL,
	`user_google_id` text NOT NULL,
	FOREIGN KEY (`user_google_id`) REFERENCES `user`(`google_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`speech_url` text NOT NULL,
	`captions_url` text NOT NULL,
	`video_url` text,
	`images` text DEFAULT [] NOT NULL,
	`config_id` text NOT NULL,
	`script_id` text NOT NULL,
	`user_google_id` text NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `config`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`script_id`) REFERENCES `generated_script`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_google_id`) REFERENCES `user`(`google_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`google_id` text NOT NULL,
	`picture` text NOT NULL
);
