import { beforeEach, describe, expect, it } from "vitest";
import { exportAgentsJson, importAgentsJson, loadAgents, type LocalAgent } from "./localStore";

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
});
