CREATE TABLE `imported_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`line_count` integer NOT NULL,
	`imported_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `imported_files_file_path_unique` ON `imported_files` (`file_path`);