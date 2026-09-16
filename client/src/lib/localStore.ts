export type AgentMode = "balanced" | "creative" | "precise" | "research";
export type ResponseLength = "brief" | "standard" | "deep";
export type AgentSettings = { mode: AgentMode; responseLength: ResponseLength; tone: string; enabledTools: string[]; vipUnlocked: boolean };
export type LocalMessage = { role: "user" | "assistant"; content: string; createdAt: number };
export type LocalNote = { id: string; title: string; content: string };
export type LocalChat = { id: string; title: string; updatedAt: number; messages: LocalMessage[] };
export type LocalAgent = {
  id: string; name: string; tagline: string; icon: string; accent: string; systemPrompt: string; capabilities: string[]; settings: AgentSettings; memories: string[]; knowledge: LocalNote[]; chats: LocalChat[]; createdAt: number;
};

export const ARPHIX_VIP_CODE = "ARPHIX";
export function isArphixVipCode(value: string) { return value.trim().toUpperCase() === ARPHIX_VIP_CODE; }

const STORAGE_KEY = "agentforge.agents.v1";
const defaultSettings: AgentSettings = { mode: "balanced", responseLength: "standard", tone: "clear and warm", enabledTools: ["calculator", "planner", "vision", "voice"], vipUnlocked: false };
function safeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function normalizeAgent(agent: any): LocalAgent { return { ...agent, id: typeof agent.id === "string" ? agent.id : safeId(), name: String(agent.name || "Imported agent"), tagline: String(agent.tagline || "A personal AI companion."), icon: String(agent.icon || "✦"), accent: String(agent.accent || "violet"), systemPrompt: String(agent.systemPrompt || "Be helpful and clear."), capabilities: Array.isArray(agent.capabilities) ? agent.capabilities.map(String) : [], settings: { ...defaultSettings, ...(agent.settings || {}) }, memories: Array.isArray(agent.memories) ? agent.memories.map(String) : [], knowledge: Array.isArray(agent.knowledge) ? agent.knowledge : [], chats: Array.isArray(agent.chats) ? agent.chats : [], createdAt: Number(agent.createdAt) || Date.now() }; }
export function loadAgents(): LocalAgent[] { try { const raw = localStorage.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.map(normalizeAgent) : []; } catch { return []; } }
export function saveAgents(agents: LocalAgent[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(agents)); }
export function addAgent(config: Omit<LocalAgent, "id" | "createdAt" | "settings" | "memories" | "knowledge" | "chats">): LocalAgent { const agent: LocalAgent = { ...config, id: safeId(), createdAt: Date.now(), settings: { ...defaultSettings }, memories: [], knowledge: [], chats: [] }; saveAgents([agent, ...loadAgents()]); return agent; }
export function getAgent(id: string) { return loadAgents().find((agent) => agent.id === id); }
export function updateAgent(id: string, update: (agent: LocalAgent) => LocalAgent) { const updated = loadAgents().map((agent) => agent.id === id ? normalizeAgent(update(agent)) : agent); saveAgents(updated); return updated.find((agent) => agent.id === id); }
export function newChatId() { return safeId(); }

export function exportAgentsJson(agents = loadAgents()) { return JSON.stringify({ app: "AgentForge", version: 1, exportedAt: new Date().toISOString(), agents }, null, 2); }
export function importAgentsJson(raw: string, mode: "merge" | "replace" = "merge") {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.app !== "AgentForge" || !Array.isArray(parsed.agents)) throw new Error("This is not a valid AgentForge backup.");
  const incoming: LocalAgent[] = parsed.agents.map((item: unknown) => normalizeAgent(item));
  const existing: LocalAgent[] = mode === "replace" ? [] : loadAgents();
  const used = new Set(existing.map((agent) => agent.id));
  const restored = incoming.map((agent) => { if (used.has(agent.id)) return { ...agent, id: safeId() }; used.add(agent.id); return agent; });
  const result = [...restored, ...existing]; saveAgents(result); return { agents: result, imported: restored.length };
}

export function exportChatJson(agent: LocalAgent, chatId?: string) {
  const chats = chatId ? agent.chats.filter((chat) => chat.id === chatId) : agent.chats;
  return JSON.stringify({ app: "AgentForge Chat", version: 1, exportedAt: new Date().toISOString(), agent: { id: agent.id, name: agent.name }, chats }, null, 2);
}

export function importChatJson(agentId: string, raw: string) {
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.app !== "AgentForge Chat" || !Array.isArray(parsed.chats)) throw new Error("This is not a valid AgentForge chat export.");
  const imported = parsed.chats.map((chat: any) => ({ id: typeof chat.id === "string" ? chat.id : safeId(), title: String(chat.title || "Imported conversation"), updatedAt: Number(chat.updatedAt) || Date.now(), messages: Array.isArray(chat.messages) ? chat.messages.filter((message: any) => message?.role === "user" || message?.role === "assistant").map((message: any) => ({ role: message.role, content: String(message.content || ""), createdAt: Number(message.createdAt) || Date.now() })) : [] }));
  const current = loadAgents(); const agent = current.find((item) => item.id === agentId); if (!agent) throw new Error("Agent not found in this browser.");
  const ids = new Set(agent.chats.map((chat) => chat.id)); const restored = imported.map((chat: LocalChat) => ids.has(chat.id) ? { ...chat, id: safeId() } : chat); const updated = current.map((item) => item.id === agentId ? { ...item, chats: [...restored, ...item.chats] } : item); saveAgents(updated); return { agent: updated.find((item) => item.id === agentId) as LocalAgent, imported: restored.length };
}
