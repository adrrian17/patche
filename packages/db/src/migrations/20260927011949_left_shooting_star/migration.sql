PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__product_media_backup` AS SELECT * FROM `product_media`;--> statement-breakpoint
CREATE TABLE `__new_product` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_product_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL,
	CONSTRAINT "product_status_check" CHECK("status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
INSERT INTO `__new_product`(`id`, `name`, `slug`, `description`, `status`, `category_id`, `created_at`, `updated_at`) SELECT `id`, `name`, `slug`, `description`, `status`, `category_id`, `created_at`, `updated_at` FROM `product`;--> statement-breakpoint
DROP TABLE `product`;--> statement-breakpoint
ALTER TABLE `__new_product` RENAME TO `product`;--> statement-breakpoint
INSERT INTO `product_media` SELECT * FROM `__product_media_backup`;--> statement-breakpoint
DROP TABLE `__product_media_backup`;--> statement-breakpoint
CREATE TABLE `__new_variant` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL UNIQUE,
	`kind` text NOT NULL,
	`price_amount` integer NOT NULL,
	`currency` text DEFAULT 'mxn' NOT NULL,
	`low_stock_threshold` integer DEFAULT 5 NOT NULL,
	`archived_at` integer,
	`digital_file_key` text,
	`digital_file_size` integer,
	`digital_file_name` text,
	CONSTRAINT `fk_variant_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`),
	CONSTRAINT "variant_currency_check" CHECK("currency" = 'mxn'),
	CONSTRAINT "variant_digital_file_size_check" CHECK("digital_file_size" is null or "digital_file_size" >= 0),
	CONSTRAINT "variant_kind_check" CHECK("kind" in ('physical', 'digital')),
	CONSTRAINT "variant_low_stock_threshold_check" CHECK("low_stock_threshold" >= 0),
	CONSTRAINT "variant_price_amount_check" CHECK("price_amount" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_variant`(`id`, `product_id`, `name`, `sku`, `kind`, `price_amount`, `currency`, `low_stock_threshold`, `archived_at`, `digital_file_key`, `digital_file_size`, `digital_file_name`) SELECT `id`, `product_id`, `name`, `sku`, `kind`, `price_amount`, `currency`, `low_stock_threshold`, `archived_at`, `digital_file_key`, `digital_file_size`, `digital_file_name` FROM `variant`;--> statement-breakpoint
DROP TABLE `variant`;--> statement-breakpoint
ALTER TABLE `__new_variant` RENAME TO `variant`;--> statement-breakpoint
CREATE INDEX `product_category_id_idx` ON `product` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE INDEX `variant_product_id_idx` ON `variant` (`product_id`);--> statement-breakpoint
CREATE INDEX `variant_kind_archived_at_idx` ON `variant` (`kind`,`archived_at`);--> statement-breakpoint
SELECT json(CASE WHEN EXISTS (SELECT 1 FROM pragma_foreign_key_check) THEN 'invalid' ELSE '[]' END);--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;
