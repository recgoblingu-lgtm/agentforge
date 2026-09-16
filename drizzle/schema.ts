import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  tagline: varchar("tagline", { length: 180 }).notNull(),
  icon: varchar("icon", { length: 8 }).notNull().default("✦"),
  accent: varchar("accent", { length: 32 }).notNull().default("violet"),
  systemPrompt: text("systemPrompt").notNull(),
  capabilities: text("capabilities").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chats = mysqlTable("chats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId").notNull(),
  title: varchar("title", { length: 120 }).notNull().default("New conversation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  chatId: int("chatId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const knowledge = mysqlTable("knowledge", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const memories = mysqlTable("memories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Knowledge = typeof knowledge.$inferSelect;
export type Memory = typeof memories.$inferSelect;
