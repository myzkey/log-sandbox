CREATE TABLE `aws_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aws_profiles_name_unique` ON `aws_profiles` (`name`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_alb_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`aws_profile` text DEFAULT 'default' NOT NULL,
	`type` text NOT NULL,
	`timestamp` text NOT NULL,
	`elb_name` text NOT NULL,
	`client_ip` text NOT NULL,
	`client_port` text NOT NULL,
	`target_ip` text,
	`target_port` text,
	`request_processing_time` real NOT NULL,
	`target_processing_time` real NOT NULL,
	`response_processing_time` real NOT NULL,
	`total_time` real NOT NULL,
	`elb_status_code` text NOT NULL,
	`target_status_code` text NOT NULL,
	`is_timeout` integer DEFAULT false NOT NULL,
	`is_rejected` integer DEFAULT false NOT NULL,
	`received_bytes` integer NOT NULL,
	`sent_bytes` integer NOT NULL,
	`request_method` text NOT NULL,
	`request_url` text NOT NULL,
	`request_path` text NOT NULL,
	`request_protocol` text NOT NULL,
	`user_agent` text,
	`ssl_cipher` text,
	`ssl_protocol` text,
	`target_group_arn` text,
	`trace_id` text,
	`domain_name` text,
	`raw_line` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_alb_logs`("id", "aws_profile", "type", "timestamp", "elb_name", "client_ip", "client_port", "target_ip", "target_port", "request_processing_time", "target_processing_time", "response_processing_time", "total_time", "elb_status_code", "target_status_code", "is_timeout", "is_rejected", "received_bytes", "sent_bytes", "request_method", "request_url", "request_path", "request_protocol", "user_agent", "ssl_cipher", "ssl_protocol", "target_group_arn", "trace_id", "domain_name", "raw_line") SELECT "id", "aws_profile", "type", "timestamp", "elb_name", "client_ip", "client_port", "target_ip", "target_port", "request_processing_time", "target_processing_time", "response_processing_time", "total_time", "elb_status_code", "target_status_code", "is_timeout", "is_rejected", "received_bytes", "sent_bytes", "request_method", "request_url", "request_path", "request_protocol", "user_agent", "ssl_cipher", "ssl_protocol", "target_group_arn", "trace_id", "domain_name", "raw_line" FROM `alb_logs`;--> statement-breakpoint
DROP TABLE `alb_logs`;--> statement-breakpoint
ALTER TABLE `__new_alb_logs` RENAME TO `alb_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `alb_logs_trace_id_unique` ON `alb_logs` (`trace_id`);