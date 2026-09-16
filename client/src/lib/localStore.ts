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
  memories: string[];
  knowledge: LocalNote[];
  chats: { id: string; title: string; updatedAt: number; messages: LocalMessage[] }[];
  createdAt: number;
};

const STORAGE_KEY = "agentforge.agents.v1";

function safeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadAgents(): LocalAgent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAgents(agents: LocalAgent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export function addAgent(config: Omit<LocalAgent, "id" | "createdAt" | "memories" | "knowledge" | "chats">): LocalAgent {
  const agent: LocalAgent = { ...config, id: safeId(), createdAt: Date.now(), memories: [], knowledge: [], chats: [] };
  saveAgents([agent, ...loadAgents()]);
  return agent;
}

export function getAgent(id: string) {
  return loadAgents().find((agent) => agent.id === id);
}

export function updateAgent(id: string, update: (agent: LocalAgent) => LocalAgent) {
  const updated = loadAgents().map((agent) => agent.id === id ? update(agent) : agent);
  saveAgents(updated);
  return updated.find((agent) => agent.id === id);
}

export function newChatId() {
  return safeId();
}
