PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`google_id` text NOT NULL,
	`picture` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "email", "username", "google_id", "picture") SELECT "id", "email", "username", "google_id", "picture" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;