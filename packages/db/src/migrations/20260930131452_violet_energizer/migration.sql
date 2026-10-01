ALTER TABLE `rate_limit` ADD `id` text;--> statement-breakpoint
UPDATE `rate_limit` SET `id` = `key`;--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_id_uidx` ON `rate_limit` (`id`);