import { describe, expect, it } from "vitest";
import { appRouter, generatedAgentSchema, responseText } from "./routers";

describe("AgentForge model response handling", () => {
  it("extracts plain text content", () => {
    expect(responseText({ choices: [{ message: { content: "Hello from the agent" } }] })).toBe("Hello from the agent");
  });

  it("joins multimodal content parts", () => {
    expect(responseText({ choices: [{ message: { content: [{ text: "First " }, { text: "second" }] } }] })).toBe("First second");
  });

  it("uses a safe empty fallback for malformed responses", () => {
    expect(responseText({ choices: [] })).toBe("");
    expect(responseText(undefined)).toBe("");
  });

  it("requires the fields needed to create a useful agent", () => {
    expect(generatedAgentSchema.required).toEqual(["name", "tagline", "icon", "accent", "systemPrompt", "capabilities"]);
    expect(generatedAgentSchema.properties.capabilities.type).toBe("array");
  });

  it("registers an anonymous public AI router", () => {
    expect(appRouter._def.procedures["publicAi.generate"]).toBeDefined();
    expect(appRouter._def.procedures["publicAi.chat"]).toBeDefined();
  });
});
