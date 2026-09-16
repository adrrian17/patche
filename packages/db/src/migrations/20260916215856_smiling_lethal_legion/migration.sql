CREATE TABLE `checkout_reservation` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`stripe_checkout_session_id` text UNIQUE,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_checkout_reservation_customer_id_user_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `user`(`id`),
	CONSTRAINT "checkout_reservation_status_check" CHECK("status" in ('pending', 'active', 'consumed', 'released'))
);
--> statement-breakpoint
CREATE TABLE `digital_upload_intent` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`created_by` text NOT NULL,
	`temporary_key` text NOT NULL UNIQUE,
	`final_key` text NOT NULL UNIQUE,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`expected_size` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`uploaded_at` integer,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_digital_upload_intent_variant_id_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variant`(`id`),
	CONSTRAINT `fk_digital_upload_intent_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`),
	CONSTRAINT "digital_upload_intent_expected_size_check" CHECK("expected_size" > 0),
	CONSTRAINT "digital_upload_intent_status_check" CHECK("status" in ('pending', 'uploading', 'uploaded', 'confirming', 'confirmed', 'expired'))
);
--> statement-breakpoint
ALTER TABLE `stock_movement` ADD `reservation_id` text REFERENCES checkout_reservation(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stock_movement` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`order_id` text,
	`reservation_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_stock_movement_variant_id_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `variant`(`id`),
	CONSTRAINT `fk_stock_movement_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`),
	CONSTRAINT `fk_stock_movement_reservation_id_checkout_reservation_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `checkout_reservation`(`id`),
	CONSTRAINT "stock_movement_quantity_check" CHECK("quantity" <> 0),
	CONSTRAINT "stock_movement_reason_check" CHECK("reason" in ('received', 'sold', 'adjusted', 'returned', 'reserved', 'released'))
);
--> statement-breakpoint
INSERT INTO `__new_stock_movement`(`id`, `variant_id`, `quantity`, `reason`, `note`, `order_id`, `created_at`) SELECT `id`, `variant_id`, `quantity`, `reason`, `note`, `order_id`, `created_at` FROM `stock_movement`;--> statement-breakpoint
DROP TABLE `stock_movement`;--> statement-breakpoint
ALTER TABLE `__new_stock_movement` RENAME TO `stock_movement`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_order` (
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
	CONSTRAINT "order_payment_status_check" CHECK("payment_status" in ('pending', 'succeeded', 'failed', 'canceled', 'refund_pending', 'refunded')),
	CONSTRAINT "order_shipping_amount_check" CHECK("shipping_amount" >= 0),
	CONSTRAINT "order_subtotal_amount_check" CHECK("subtotal_amount" >= 0),
	CONSTRAINT "order_total_amount_check" CHECK("total_amount" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_order`(`id`, `customer_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `stripe_customer_id`, `payment_status`, `fulfillment_status`, `subtotal_amount`, `shipping_amount`, `total_amount`, `currency`, `payment_method_type`, `shipping_name`, `shipping_address`, `created_at`, `updated_at`) SELECT `id`, `customer_id`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `stripe_customer_id`, `payment_status`, `fulfillment_status`, `subtotal_amount`, `shipping_amount`, `total_amount`, `currency`, `payment_method_type`, `shipping_name`, `shipping_address`, `created_at`, `updated_at` FROM `order`;--> statement-breakpoint
DROP TABLE `order`;--> statement-breakpoint
ALTER TABLE `__new_order` RENAME TO `order`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `stock_movement_order_id_idx` ON `stock_movement` (`order_id`);--> statement-breakpoint
CREATE INDEX `stock_movement_reservation_id_idx` ON `stock_movement` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `stock_movement_variant_id_created_at_idx` ON `stock_movement` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_customer_id_created_at_idx` ON `order` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_fulfillment_status_idx` ON `order` (`fulfillment_status`);--> statement-breakpoint
CREATE INDEX `order_payment_status_idx` ON `order` (`payment_status`);--> statement-breakpoint
CREATE INDEX `checkout_reservation_customer_id_idx` ON `checkout_reservation` (`customer_id`);--> statement-breakpoint
CREATE INDEX `checkout_reservation_status_expires_at_idx` ON `checkout_reservation` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `digital_upload_intent_status_expires_at_idx` ON `digital_upload_intent` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `digital_upload_intent_variant_id_idx` ON `digital_upload_intent` (`variant_id`);--> statement-breakpoint
CREATE TRIGGER `stock_movement_prevent_negative_insert`
BEFORE INSERT ON `stock_movement`
WHEN NEW.`quantity` < 0
  AND (
    SELECT coalesce(sum(`quantity`), 0)
    FROM `stock_movement`
    WHERE `variant_id` = NEW.`variant_id`
  ) + NEW.`quantity` < 0
BEGIN
  SELECT raise(ABORT, 'insufficient_stock');
END;--> statement-breakpoint
CREATE TRIGGER `stock_movement_prevent_negative_update`
BEFORE UPDATE OF `quantity`, `variant_id` ON `stock_movement`
WHEN (
  SELECT coalesce(sum(`quantity`), 0)
  FROM `stock_movement`
  WHERE `variant_id` = NEW.`variant_id`
    AND `id` <> OLD.`id`
) + NEW.`quantity` < 0
BEGIN
  SELECT raise(ABORT, 'insufficient_stock');
END;
