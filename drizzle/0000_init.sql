CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`stage` text NOT NULL,
	`salary_min` integer,
	`salary_max` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`work_mode` text DEFAULT 'onsite' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`next_step` text DEFAULT '' NOT NULL,
	`next_step_due` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `applications_stage_idx` ON `applications` (`stage`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`name` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`from_stage` text,
	`to_stage` text NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_app_idx` ON `events` (`application_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`body` text NOT NULL,
	`stage` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notes_app_idx` ON `notes` (`application_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text NOT NULL,
	`category` text NOT NULL,
	`stage` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
