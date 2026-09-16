import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Agent,
  Chat,
  InsertUser,
  Knowledge,
  Memory,
  Message,
  agents,
  chats,
  knowledge,
  memories,
  messages,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function insertedId(result: unknown) {
  const packet = Array.isArray(result) ? result[0] : result;
  return Number((packet as { insertId?: number })?.insertId ?? 0);
}

export async function getAgents(userId: number): Promise<Agent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agents).where(eq(agents.userId, userId)).orderBy(desc(agents.updatedAt));
}

export async function getAgentById(userId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agents).where(and(eq(agents.id, id), eq(agents.userId, userId))).limit(1);
  return result[0];
}

export async function createAgent(data: typeof agents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(agents).values(data);
  const id = insertedId(result);
  const created = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return created[0];
}

export async function removeAgent(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(agents).where(and(eq(agents.id, id), eq(agents.userId, userId)));
}

export async function getChats(userId: number, agentId: number): Promise<Chat[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chats).where(and(eq(chats.userId, userId), eq(chats.agentId, agentId))).orderBy(desc(chats.updatedAt));
}

export async function getChat(userId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chats).where(and(eq(chats.id, id), eq(chats.userId, userId))).limit(1);
  return result[0];
}

export async function createChat(data: typeof chats.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(chats).values(data);
  const id = insertedId(result);
  const created = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
  return created[0];
}

export async function getMessages(userId: number, chatId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  const ownedChat = await getChat(userId, chatId);
  if (!ownedChat) return [];
  return db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(messages.createdAt);
}

export async function addMessage(data: typeof messages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(messages).values(data);
  await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, data.chatId));
}

export async function getKnowledge(userId: number, agentId: number): Promise<Knowledge[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledge).where(and(eq(knowledge.userId, userId), eq(knowledge.agentId, agentId))).orderBy(desc(knowledge.createdAt));
}

export async function createKnowledge(data: typeof knowledge.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(knowledge).values(data);
  const id = insertedId(result);
  const created = await db.select().from(knowledge).where(eq(knowledge.id, id)).limit(1);
  return created[0];
}

export async function deleteKnowledge(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(knowledge).where(and(eq(knowledge.id, id), eq(knowledge.userId, userId)));
}

export async function getMemories(userId: number, agentId: number): Promise<Memory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(memories).where(and(eq(memories.userId, userId), eq(memories.agentId, agentId))).orderBy(desc(memories.createdAt));
}

export async function createMemory(data: typeof memories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(memories).values(data);
  const id = insertedId(result);
  const created = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
  return created[0];
}

export async function deleteMemory(userId: number, id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(memories).where(and(eq(memories.id, id), eq(memories.userId, userId)));
}
