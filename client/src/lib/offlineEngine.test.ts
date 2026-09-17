import { describe, expect, it } from "vitest";
import { createOfflineResponse, generateAgentConfig } from "./offlineEngine";
import type { LocalAgent } from "./localStore";

const agent: LocalAgent = {
  id: "offline-agent",
  name: "Focus Planner",
  tagline: "A local planner",
  icon: "◈",
  accent: "emerald",
  systemPrompt: "Be local.",
  capabilities: ["Prioritize tasks"],
  settings: { mode: "balanced", responseLength: "standard", tone: "clear", enabledTools: [], vipUnlocked: false },
  memories: ["I work best in the morning."],
  knowledge: [{ id: "note-1", title: "Project", content: "Launch a static site this week." }],
  chats: [],
  createdAt: 1,
};

describe("offline agent engine", () => {
  it("creates deterministic local companion profiles", () => {
    const prompt = "A patient study coach to help me prepare for an exam.";
    expect(generateAgentConfig(prompt)).toEqual(generateAgentConfig(prompt));
    expect(generateAgentConfig(prompt).name).toBe("Study Guide");
  });

  it("returns a local planning response with saved context", () => {
    const response = createOfflineResponse(agent, [{ role: "user", content: "Help me plan my website launch." }]);
    expect(response).toContain("A practical plan");
    expect(response).toContain("I work best in the morning.");
    expect(response).toContain("Launch a static site this week.");
  });

  it("does not claim to analyse file attachments", () => {
    const response = createOfflineResponse(agent, [{ role: "user", content: "Please review this\n[diagram.png]" }]);
    expect(response).toContain("does not analyse files");
  });
});
