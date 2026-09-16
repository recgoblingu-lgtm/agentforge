import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addMessage,
  createAgent,
  createChat,
  createKnowledge,
  createMemory,
  deleteKnowledge,
  deleteMemory,
  getAgentById,
  getAgents,
  getChat,
  getChats,
  getKnowledge,
  getMemories,
  getMessages,
  removeAgent,
} from "./db";

export function responseText(response: any) {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part?.text ?? "").join("");
  return "";
}

export const generatedAgentSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "A memorable short name for the AI agent" },
    tagline: { type: "string", description: "A one-line description under 140 characters" },
    icon: { type: "string", description: "One emoji that represents the agent" },
    accent: { type: "string", description: "One of violet, cyan, amber, rose, or emerald" },
    systemPrompt: { type: "string", description: "Detailed system instructions for the agent" },
    capabilities: { type: "array", items: { type: "string" }, description: "3 to 5 plain-language capability labels" },
  },
  required: ["name", "tagline", "icon", "accent", "systemPrompt", "capabilities"],
  additionalProperties: false,
};

const publicMessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(12000) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Public endpoints used by the GitHub Pages build. Agents stay in the visitor's browser.
  publicAi: router({
    generate: publicProcedure.input(z.object({ prompt: z.string().min(10).max(4000) })).mutation(async ({ input }) => {
      const generated = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert AI product designer. Turn a user's description into a useful, safe, friendly AI agent configuration. Keep the system instructions practical and specific. Return JSON only." },
          { role: "user", content: input.prompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: "agent_config", strict: true, schema: generatedAgentSchema } },
      });
      try {
        const config = JSON.parse(responseText(generated));
        return {
          name: String(config.name || "New companion").slice(0, 80),
          tagline: String(config.tagline || "A personal AI companion.").slice(0, 180),
          icon: String(config.icon || "✦").slice(0, 8),
          accent: ["violet", "cyan", "amber", "rose", "emerald"].includes(config.accent) ? config.accent : "violet",
          systemPrompt: String(config.systemPrompt || input.prompt),
          capabilities: Array.isArray(config.capabilities) ? config.capabilities.slice(0, 5) : ["Helpful conversation", "Clear explanations", "Creative thinking"],
        };
      } catch {
        return { name: "New companion", tagline: "A thoughtful AI built from your idea.", icon: "✦", accent: "violet", systemPrompt: input.prompt, capabilities: ["Helpful conversation", "Clear explanations", "Creative thinking"] };
      }
    }),
    chat: publicProcedure.input(z.object({ systemPrompt: z.string().min(1).max(20000), messages: z.array(publicMessageSchema).min(1).max(40), imageDataUrl: z.string().max(8_000_000).optional() })).mutation(async ({ input }) => {
      const last = input.messages[input.messages.length - 1];
      const content: any = input.imageDataUrl ? [{ type: "text", text: last.content }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "auto" } }] : last.content;
      const response = await invokeLLM({
        messages: [{ role: "system", content: `${input.systemPrompt}\n\nBe honest about limits. Keep answers warm, useful, and easy to scan.` }, ...input.messages.slice(0, -1), { role: "user", content }],
      });
      return { answer: responseText(response) || "I’m here, but I couldn’t generate a response this time. Try again." };
    }),
  }),

  agents: router({
    list: protectedProcedure.query(({ ctx }) => getAgents(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getAgentById(ctx.user.id, input.id)),
    createFromPrompt: protectedProcedure.input(z.object({ prompt: z.string().min(10).max(4000) })).mutation(async ({ ctx, input }) => {
      const generated = await invokeLLM({ messages: [{ role: "system", content: "You are an expert AI product designer. Return JSON only." }, { role: "user", content: input.prompt }], response_format: { type: "json_schema", json_schema: { name: "agent_config", strict: true, schema: generatedAgentSchema } } });
      const config = JSON.parse(responseText(generated));
      return createAgent({ userId: ctx.user.id, name: String(config.name || "New companion").slice(0, 80), tagline: String(config.tagline || "A personal AI companion.").slice(0, 180), icon: String(config.icon || "✦").slice(0, 8), accent: ["violet", "cyan", "amber", "rose", "emerald"].includes(config.accent) ? config.accent : "violet", systemPrompt: String(config.systemPrompt || input.prompt), capabilities: JSON.stringify(Array.isArray(config.capabilities) ? config.capabilities.slice(0, 5) : []) });
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => removeAgent(ctx.user.id, input.id)),
  }),

  chat: router({
    list: protectedProcedure.input(z.object({ agentId: z.number().int().positive() })).query(({ ctx, input }) => getChats(ctx.user.id, input.agentId)),
    messages: protectedProcedure.input(z.object({ chatId: z.number().int().positive() })).query(({ ctx, input }) => getMessages(ctx.user.id, input.chatId)),
    send: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), chatId: z.number().int().positive().optional(), message: z.string().min(1).max(12000), imageDataUrl: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const agent = await getAgentById(ctx.user.id, input.agentId);
      if (!agent) throw new Error("Agent not found");
      let chat = input.chatId ? await getChat(ctx.user.id, input.chatId) : undefined;
      if (!chat) chat = await createChat({ userId: ctx.user.id, agentId: agent.id, title: input.message.slice(0, 80) });
      if (!chat) throw new Error("Unable to create conversation");
      const [savedMessages, notes, memories] = await Promise.all([getMessages(ctx.user.id, chat.id), getKnowledge(ctx.user.id, agent.id), getMemories(ctx.user.id, agent.id)]);
      const context = [notes.length ? `Knowledge notes:\n${notes.map((n) => `- ${n.title}: ${n.content}`).join("\n")}` : "", memories.length ? `Remember about the user:\n${memories.map((m) => `- ${m.content}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
      const userContent: any = input.imageDataUrl ? [{ type: "text", text: input.message }, { type: "image_url", image_url: { url: input.imageDataUrl, detail: "auto" } }] : input.message;
      await addMessage({ chatId: chat.id, role: "user", content: input.imageDataUrl ? `${input.message}\n[Image attached]` : input.message });
      const response = await invokeLLM({ messages: [{ role: "system", content: `${agent.systemPrompt}\n\n${context}\n\nBe honest about limits. Keep answers warm, useful, and easy to scan.` }, ...savedMessages.map((message) => ({ role: message.role, content: message.content })), { role: "user", content: userContent }] });
      const answer = responseText(response) || "I’m here, but I couldn’t generate a response this time. Try again.";
      await addMessage({ chatId: chat.id, role: "assistant", content: answer });
      return { chatId: chat.id, userMessage: input.imageDataUrl ? `${input.message}\n[Image attached]` : input.message, assistantMessage: answer };
    }),
  }),

  knowledge: router({ list: protectedProcedure.input(z.object({ agentId: z.number().int().positive() })).query(({ ctx, input }) => getKnowledge(ctx.user.id, input.agentId)), add: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), title: z.string().min(1).max(160), content: z.string().min(1).max(20000) })).mutation(({ ctx, input }) => createKnowledge({ userId: ctx.user.id, ...input })), remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteKnowledge(ctx.user.id, input.id)) }),
  memory: router({ list: protectedProcedure.input(z.object({ agentId: z.number().int().positive() })).query(({ ctx, input }) => getMemories(ctx.user.id, input.agentId)), add: protectedProcedure.input(z.object({ agentId: z.number().int().positive(), content: z.string().min(1).max(1000) })).mutation(({ ctx, input }) => createMemory({ userId: ctx.user.id, ...input })), remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteMemory(ctx.user.id, input.id)) }),
});

export type AppRouter = typeof appRouter;
