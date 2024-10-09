CREATE TABLE `config` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`topic` text NOT NULL,
	`duration` integer DEFAULT 30 NOT NULL,
	`style` text NOT NULL,
	`script_id` text,
	FOREIGN KEY (`script_id`) REFERENCES `generated_script`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `generated_script` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`script` text DEFAULT [] NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`speech_url` text NOT NULL,
	`captions_url` text NOT NULL,
	`images` text DEFAULT [] NOT NULL,
	`config_id` text,
	`script_id` text,
	FOREIGN KEY (`config_id`) REFERENCES `config`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`script_id`) REFERENCES `generated_script`(`id`) ON UPDATE no action ON DELETE no action
);
