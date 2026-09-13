CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`category_id` text,
	`stripe_product_id` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_product_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL,
	CONSTRAINT "product_status_check" CHECK("status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`r2_key` text NOT NULL UNIQUE,
	`alt` text DEFAULT '' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_product_media_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE,
	CONSTRAINT "product_media_sort_check" CHECK("sort" >= 0)
);
--> statement-breakpoint
CREATE TABLE `variant` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL UNIQUE,
	`kind` text NOT NULL,
	`price_amount` integer NOT NULL,
	`currency` text DEFAULT 'mxn' NOT NULL,
	`stripe_price_id` text NOT NULL UNIQUE,
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
CREATE TABLE `stock_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`order_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_stock_movement_variant_id_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variant`(`id`),
	CONSTRAINT `fk_stock_movement_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`),
	CONSTRAINT "stock_movement_quantity_check" CHECK("quantity" <> 0),
	CONSTRAINT "stock_movement_reason_check" CHECK("reason" in ('received', 'sold', 'adjusted', 'returned'))
);
--> statement-breakpoint
CREATE TABLE `download_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`order_item_id` text NOT NULL UNIQUE,
	`customer_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_download_grant_order_item_id_order_item_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_item`(`id`),
	CONSTRAINT `fk_download_grant_customer_id_user_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_download_grant_variant_id_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variant`(`id`)
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`stripe_checkout_session_id` text NOT NULL UNIQUE,
	`stripe_payment_intent_id` text,
	`stripe_customer_id` text,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`fulfillment_status` text DEFAULT 'unfulfilled' NOT NULL,
	`subtotal_amount` integer NOT NULL,
	`shipping_amount` integer NOT NULL,
	`total_amount` integer NOT NULL,
	`currency` text DEFAULT 'mxn' NOT NULL,
	`payment_method_type` text,
	`shipping_name` text,
	`shipping_address` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_order_customer_id_user_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`),
	CONSTRAINT "order_currency_check" CHECK("currency" = 'mxn'),
	CONSTRAINT "order_fulfillment_status_check" CHECK("fulfillment_status" in ('unfulfilled', 'shipped', 'delivered')),
	CONSTRAINT "order_payment_status_check" CHECK("payment_status" in ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
	CONSTRAINT "order_shipping_amount_check" CHECK("shipping_amount" >= 0),
	CONSTRAINT "order_subtotal_amount_check" CHECK("subtotal_amount" >= 0),
	CONSTRAINT "order_total_amount_check" CHECK("total_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`product_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`kind` text NOT NULL,
	`unit_amount` integer NOT NULL,
	`quantity` integer NOT NULL,
	CONSTRAINT `fk_order_item_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`),
	CONSTRAINT `fk_order_item_variant_id_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variant`(`id`),
	CONSTRAINT "order_item_kind_check" CHECK("kind" in ('physical', 'digital')),
	CONSTRAINT "order_item_quantity_check" CHECK("quantity" > 0),
	CONSTRAINT "order_item_unit_amount_check" CHECK("unit_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE `stripe_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `store_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_category_id_idx` ON `product` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint
CREATE INDEX `product_media_product_id_sort_idx` ON `product_media` (`product_id`,`sort`);--> statement-breakpoint
CREATE INDEX `variant_product_id_idx` ON `variant` (`product_id`);--> statement-breakpoint
CREATE INDEX `variant_kind_archived_at_idx` ON `variant` (`kind`,`archived_at`);--> statement-breakpoint
CREATE INDEX `stock_movement_order_id_idx` ON `stock_movement` (`order_id`);--> statement-breakpoint
CREATE INDEX `stock_movement_variant_id_created_at_idx` ON `stock_movement` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `download_grant_customer_id_idx` ON `download_grant` (`customer_id`);--> statement-breakpoint
CREATE INDEX `download_grant_variant_id_idx` ON `download_grant` (`variant_id`);--> statement-breakpoint
CREATE INDEX `order_customer_id_created_at_idx` ON `order` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_fulfillment_status_idx` ON `order` (`fulfillment_status`);--> statement-breakpoint
CREATE INDEX `order_payment_status_idx` ON `order` (`payment_status`);--> statement-breakpoint
CREATE INDEX `order_item_order_id_idx` ON `order_item` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_item_variant_id_idx` ON `order_item` (`variant_id`);