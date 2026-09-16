CREATE TABLE `rate_limit` (
	`count` integer NOT NULL,
	`key` text NOT NULL UNIQUE,
	`last_request` integer NOT NULL
);
