CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`tagline` varchar(180) NOT NULL,
	`icon` varchar(8) NOT NULL DEFAULT '✦',
	`accent` varchar(32) NOT NULL DEFAULT 'violet',
	`systemPrompt` text NOT NULL,
	`capabilities` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int NOT NULL,
	`title` varchar(120) NOT NULL DEFAULT 'New conversation',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
