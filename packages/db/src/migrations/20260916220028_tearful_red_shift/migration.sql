ALTER TABLE `order` ADD `reservation_id` text REFERENCES checkout_reservation(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_order` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`stripe_checkout_session_id` text NOT NULL UNIQUE,
	`reservation_id` text UNIQUE,
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
	CONSTRAINT `fk_order_reservation_id_checkout_reservation_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `checkout_reservation`(`id`),
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
CREATE INDEX `order_customer_id_created_at_idx` ON `order` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_fulfillment_status_idx` ON `order` (`fulfillment_status`);--> statement-breakpoint
CREATE INDEX `order_payment_status_idx` ON `order` (`payment_status`);--> statement-breakpoint
CREATE TRIGGER `order_require_active_reservation`
BEFORE INSERT ON `order`
WHEN NEW.`reservation_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM `checkout_reservation`
    WHERE `id` = NEW.`reservation_id`
      AND `stripe_checkout_session_id` = NEW.`stripe_checkout_session_id`
      AND `status` = 'active'
  )
BEGIN
  SELECT raise(ABORT, 'invalid_reservation');
END;--> statement-breakpoint
CREATE TRIGGER `order_consume_reservation`
AFTER INSERT ON `order`
WHEN NEW.`reservation_id` IS NOT NULL
BEGIN
  UPDATE `stock_movement`
  SET `reason` = 'sold', `order_id` = NEW.`id`
  WHERE `reservation_id` = NEW.`reservation_id`
    AND `reason` = 'reserved';

  UPDATE `checkout_reservation`
  SET `status` = 'consumed',
      `updated_at` = cast(unixepoch('subsecond') * 1000 as integer)
  WHERE `id` = NEW.`reservation_id`
    AND `status` = 'active';
END;
