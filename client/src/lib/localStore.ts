export type AgentMode = "balanced" | "creative" | "precise" | "research";
export type ResponseLength = "brief" | "standard" | "deep";
export type AgentSettings = { mode: AgentMode; responseLength: ResponseLength; tone: string; enabledTools: string[]; vipUnlocked: boolean };
export type LocalMessage = { role: "user" | "assistant"; content: string; createdAt: number };
export type LocalNote = { id: string; title: string; content: string };
export type LocalAgent = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  accent: string;
  systemPrompt: string;
  capabilities: string[];
  settings: AgentSettings;
  memories: string[];
  knowledge: LocalNote[];
  chats: { id: string; title: string; updatedAt: number; messages: LocalMessage[] }[];
  createdAt: number;
};

const STORAGE_KEY = "agentforge.agents.v1";
const defaultSettings: AgentSettings = { mode: "balanced", responseLength: "standard", tone: "clear and warm", enabledTools: ["calculator", "planner", "vision", "voice"], vipUnlocked: false };

function safeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function normalizeAgent(agent: any): LocalAgent { return { ...agent, settings: { ...defaultSettings, ...(agent.settings || {}) }, memories: Array.isArray(agent.memories) ? agent.memories : [], knowledge: Array.isArray(agent.knowledge) ? agent.knowledge : [], chats: Array.isArray(agent.chats) ? agent.chats : [] }; }

export function loadAgents(): LocalAgent[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.map(normalizeAgent) : []; } catch { return []; }
}
export function saveAgents(agents: LocalAgent[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(agents)); }
export function addAgent(config: Omit<LocalAgent, "id" | "createdAt" | "settings" | "memories" | "knowledge" | "chats">): LocalAgent {
  const agent: LocalAgent = { ...config, id: safeId(), createdAt: Date.now(), settings: { ...defaultSettings }, memories: [], knowledge: [], chats: [] };
  saveAgents([agent, ...loadAgents()]); return agent;
}
export function getAgent(id: string) { return loadAgents().find((agent) => agent.id === id); }
export function updateAgent(id: string, update: (agent: LocalAgent) => LocalAgent) { const updated = loadAgents().map((agent) => agent.id === id ? normalizeAgent(update(agent)) : agent); saveAgents(updated); return updated.find((agent) => agent.id === id); }
export function newChatId() { return safeId(); }
