import type { MLCEngine } from "@mlc-ai/web-llm";
import type { LocalAgent } from "./localStore";

export const LOCAL_MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC";
export type LocalLLMStatus = "idle" | "loading" | "ready" | "generating" | "unsupported" | "error";

type StatusListener = (status: LocalLLMStatus, detail: string) => void;

let engine: MLCEngine | undefined;
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
  return { ready: Boolean(engine), loading: Boolean(loading), error: lastError };
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

  notify("loading", "Preparing the local model. The first download can be large; later visits use the browser cache.");
  loading = import("@mlc-ai/web-llm").then(({ CreateMLCEngine }) => CreateMLCEngine(LOCAL_MODEL_ID, {
    initProgressCallback: (progress) => notify("loading", progress.text || "Downloading the local model…"),
  }))
    .then((created) => {
      engine = created;
      notify("ready", "Local model ready. Your prompts and responses stay in this browser.");
      return created;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "The local model could not be loaded.";
      notify("error", message);
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
    messages: [{ role: "system", content: system }, ...messages.slice(-16)],
    temperature: agent.settings.mode === "precise" ? 0.35 : agent.settings.mode === "creative" ? 0.9 : 0.65,
    max_tokens: agent.settings.responseLength === "brief" ? 180 : agent.settings.responseLength === "deep" ? 500 : 320,
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
