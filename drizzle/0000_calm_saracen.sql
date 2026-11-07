CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`voice_id` text,
	`fish_model_id` text,
	`text` text NOT NULL,
	`model` text NOT NULL,
	`format` text DEFAULT 'mp3' NOT NULL,
	`speed` real DEFAULT 1 NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`voice_id`) REFERENCES `voices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `generations_created_at_idx` ON `generations` (`created_at`);--> statement-breakpoint
CREATE INDEX `generations_voice_id_idx` ON `generations` (`voice_id`);--> statement-breakpoint
CREATE TABLE `voices` (
	`id` text PRIMARY KEY NOT NULL,
	`fish_model_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`state` text DEFAULT 'created' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`languages` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `voices_fish_model_id_unique` ON `voices` (`fish_model_id`);