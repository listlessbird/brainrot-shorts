DROP INDEX IF EXISTS `generated_script_user_google_id_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_google_id_unique` ON `user` (`google_id`);