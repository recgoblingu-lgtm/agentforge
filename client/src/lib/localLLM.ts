import type { MLCEngine } from "@mlc-ai/web-llm";
import type { LocalAgent } from "./localStore";

export const LOCAL_MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
const MODEL_LADDER = [
  { id: "TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC", label: "TinyLlama Fastest", vram: "about 800 MB" },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B Fast", vram: "about 900 MB" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B Smart", vram: "about 2.3 GB" },
] as const;
export type LocalLLMStatus = "idle" | "loading" | "ready" | "generating" | "unsupported" | "error";

type StatusListener = (status: LocalLLMStatus, detail: string) => void;

let engine: MLCEngine | undefined;
let activeModel = "";
let loading: Promise<MLCEngine> | undefined;
let lastError = "";
const listeners = new Set<StatusListener>();

function notify(status: LocalLLMStatus, detail: string) {
  lastError = status === "error" ? detail : lastError;
  listeners.forEach((listener) => listener(status, detail));
}

export function subscribeLocalLLM(listener: StatusListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLocalLLMState() {
  return { ready: Boolean(engine), loading: Boolean(loading), error: lastError, model: activeModel };
}

export function supportsLocalLLM() {
  return typeof window !== "undefined" && "gpu" in navigator;
}

export async function loadLocalLLM() {
  if (engine) return engine;
  if (loading) return loading;
  if (!supportsLocalLLM()) {
    notify("unsupported", "This browser does not expose WebGPU. The built-in offline fallback is still available.");
    throw new Error("WebGPU is not available in this browser.");
  }

  notify("loading", "Preparing the smartest model this device can support. If it cannot fit, AgentForge automatically tries smaller faster models.");
  loading = import("@mlc-ai/web-llm").then(async ({ CreateMLCEngine }) => {
    let lastModelError: unknown;
    for (const candidate of MODEL_LADDER) {
      try {
        notify("loading", `Trying ${candidate.label} (${candidate.vram}). Cached models start faster.`);
        const created = await CreateMLCEngine(candidate.id, {
          initProgressCallback: (progress) => notify("loading", `${candidate.label}: ${progress.text || "downloading…"}`),
        });
        activeModel = candidate.id;
        engine = created;
        notify("ready", `${candidate.label} ready. Responses stay in this browser.`);
        return created;
      } catch (error) {
        lastModelError = error;
      }
    }
    throw lastModelError instanceof Error ? lastModelError : new Error("No local model could be loaded.");
  })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "The local models could not be loaded.";
      notify("error", `Local AI unavailable: ${message}`);
      throw error;
    })
    .finally(() => {
      loading = undefined;
    });
  return loading;
}

function contextFor(agent: LocalAgent) {
  const notes = agent.knowledge.slice(0, 6).map((note) => `- ${note.title}: ${note.content}`).join("\n");
  const memories = agent.memories.slice(0, 8).map((memory) => `- ${memory}`).join("\n");
  return [notes && `Saved knowledge:\n${notes}`, memories && `Saved memories:\n${memories}`].filter(Boolean).join("\n\n");
}

export async function generateLocalLLMResponse(agent: LocalAgent, messages: Array<{ role: "user" | "assistant"; content: string }>, onToken?: (text: string) => void) {
  const activeEngine = await loadLocalLLM();
  notify("generating", "Generating locally on this device…");
  const system = `${agent.systemPrompt}\n\nYou are running fully locally in a browser on a mobile device. Never claim to browse or call an external service. Be helpful, honest, and concise. Use the saved context when relevant.\n\n${contextFor(agent)}`;
  const request = await activeEngine.chat.completions.create({
    messages: [{ role: "system", content: system }, ...messages.slice(-10)],
    temperature: agent.settings.mode === "precise" ? 0.35 : agent.settings.mode === "creative" ? 0.9 : 0.65,
    max_tokens: agent.settings.responseLength === "brief" ? 140 : agent.settings.responseLength === "deep" ? 360 : 240,
    stream: true,
  });
  let answer = "";
  for await (const chunk of request) {
    const token = chunk.choices[0]?.delta.content || "";
    answer += token;
    if (token) onToken?.(token);
  }
  notify("ready", "Local model ready.");
  return answer.trim() || "The local model returned an empty response. Try again.";
}
