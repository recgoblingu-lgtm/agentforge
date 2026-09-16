import { beforeEach, describe, expect, it } from "vitest";
import { exportAgentsJson, exportChatJson, importAgentsJson, importChatJson, isArphixVipCode, loadAgents, type LocalAgent } from "./localStore";

const sample: LocalAgent = {
  id: "agent-1", name: "Study Desk", tagline: "A patient tutor", icon: "✦", accent: "cyan", systemPrompt: "Teach clearly.", capabilities: ["Teaching"], settings: { mode: "precise", responseLength: "standard", tone: "clear", enabledTools: ["calculator"], vipUnlocked: false }, memories: ["I like examples."], knowledge: [{ id: "note-1", title: "Course", content: "Algebra" }], chats: [], createdAt: 123,
};

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
});

describe("AgentForge backups", () => {
  it("exports a portable AgentForge JSON envelope", () => {
    const parsed = JSON.parse(exportAgentsJson([sample]));
    expect(parsed.app).toBe("AgentForge");
    expect(parsed.version).toBe(1);
    expect(parsed.agents[0].name).toBe("Study Desk");
  });

  it("imports backups and preserves agent settings and memories", () => {
    const result = importAgentsJson(exportAgentsJson([sample]), "replace");
    expect(result.imported).toBe(1);
    expect(loadAgents()[0]?.settings.mode).toBe("precise");
    expect(loadAgents()[0]?.memories).toEqual(["I like examples."]);
  });

  it("accepts the ArphixVIP unlock code", () => {
    expect(isArphixVipCode(" Arphix ")).toBe(true);
    expect(isArphixVipCode("wrong-code")).toBe(false);
  });

  it("exports and imports chat history without losing messages", () => {
    const agentWithChat = { ...sample, chats: [{ id: "chat-1", title: "Imported lesson", updatedAt: 456, messages: [{ role: "user" as const, content: "Hello", createdAt: 457 }, { role: "assistant" as const, content: "Hi there", createdAt: 458 }] }] };
    const exported = exportChatJson(agentWithChat, "chat-1");
    saveLocalAgent(agentWithChat);
    const result = importChatJson("agent-1", exported);
    expect(result.imported).toBe(1);
    expect(result.agent.chats[0]?.messages[0]?.content).toBe("Hello");
  });
});

function saveLocalAgent(agent: LocalAgent) { localStorage.setItem("agentforge.agents.v1", JSON.stringify([agent])); }
