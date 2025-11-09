-- Add aws_profile column with default value for existing records
ALTER TABLE `alb_logs` ADD COLUMN `aws_profile` text NOT NULL DEFAULT 'default';
