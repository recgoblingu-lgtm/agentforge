import type { AgentMode, LocalAgent, ResponseLength } from "./localStore";

export type AgentBlueprint = Pick<LocalAgent, "name" | "tagline" | "icon" | "accent" | "systemPrompt" | "capabilities">;
type ConversationMessage = { role: "user" | "assistant"; content: string };

type AgentArchetype = {
  name: string;
  tagline: string;
  icon: string;
  accent: string;
  capabilities: string[];
  terms: string[];
  focus: string;
};

const archetypes: AgentArchetype[] = [
  {
    name: "Study Guide",
    tagline: "A patient partner for clearer learning and steady progress.",
    icon: "✦",
    accent: "cyan",
    capabilities: ["Break down concepts", "Create study plans", "Draft practice questions"],
    terms: ["study", "learn", "school", "class", "course", "exam", "quiz", "tutor", "teach", "homework"],
    focus: "learning goals, concrete examples, and short practice loops",
  },
  {
    name: "Idea Partner",
    tagline: "A practical creative partner for turning rough thoughts into options.",
    icon: "✺",
    accent: "rose",
    capabilities: ["Generate directions", "Compare concepts", "Shape a next draft"],
    terms: ["creative", "idea", "campaign", "write", "story", "design", "brand", "brainstorm", "concept"],
    focus: "fresh directions, useful constraints, and clear next drafts",
  },
  {
    name: "Focus Planner",
    tagline: "A calm planning companion for priorities, routines, and momentum.",
    icon: "◈",
    accent: "emerald",
    capabilities: ["Prioritize tasks", "Build simple plans", "Reflect on progress"],
    terms: ["plan", "planner", "routine", "week", "schedule", "organize", "focus", "productive", "habit", "priority"],
    focus: "priorities, manageable steps, and sustainable follow-through",
  },
  {
    name: "Code Companion",
    tagline: "A structured partner for reasoning through code and technical decisions.",
    icon: "⌘",
    accent: "violet",
    capabilities: ["Clarify requirements", "Outline implementation", "Review trade-offs"],
    terms: ["code", "program", "developer", "software", "website", "app", "javascript", "python", "debug", "api"],
    focus: "requirements, implementation steps, and explicit trade-offs",
  },
  {
    name: "Research Desk",
    tagline: "A methodical companion for framing questions and organizing evidence.",
    icon: "◌",
    accent: "amber",
    capabilities: ["Frame research questions", "Organize supplied notes", "Create evidence checklists"],
    terms: ["research", "analyze", "analysis", "evidence", "report", "investigate", "compare"],
    focus: "clear questions, structured notes, and evidence to verify",
  },
];

const fallback: AgentArchetype = {
  name: "Private Companion",
  tagline: "A local-first thinking partner for focused conversations.",
  icon: "✦",
  accent: "violet",
  capabilities: ["Clarify a goal", "Organize ideas", "Draft a next step"],
  terms: [],
  focus: "the goal in front of you, options you can evaluate, and one useful next step",
};

function chooseArchetype(prompt: string): AgentArchetype {
  const text = prompt.toLowerCase();
  return archetypes
    .map((archetype) => ({ archetype, score: archetype.terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0) }))
    .sort((left, right) => right.score - left.score)[0]?.score
    ? archetypes
        .map((archetype) => ({ archetype, score: archetype.terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0) }))
        .sort((left, right) => right.score - left.score)[0].archetype
    : fallback;
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function requestedName(prompt: string) {
  const match = prompt.match(/(?:call(?:ed)?|name(?:d)?)\s+(?:it\s+)?["']?([a-z0-9][a-z0-9 -]{1,30})/i);
  if (!match?.[1]) return undefined;
  const candidate = match[1].replace(/\b(?:who|that|to|and)\b.*$/i, "").trim();
  return candidate.length >= 2 ? titleCase(candidate) : undefined;
}

function compactPrompt(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;
}

export function generateAgentConfig(prompt: string): AgentBlueprint {
  const normalized = compactPrompt(prompt);
  const archetype = chooseArchetype(normalized);
  const name = requestedName(normalized) || archetype.name;

  return {
    name,
    tagline: archetype.tagline,
    icon: archetype.icon,
    accent: archetype.accent,
    capabilities: archetype.capabilities,
    systemPrompt: `You are ${name}, a private offline companion. Help the user through ${archetype.focus}. Work only with the conversation, saved notes, and memories in this browser. Do not claim to browse the web, access external services, or know facts that were not supplied. Ask a focused follow-up question when more context would materially improve the answer. The user described this role as: ${normalized}`,
  };
}

function stripAttachmentMarker(value: string) {
  return value.replace(/\n?\[[^\]]+\]\s*$/g, "").trim();
}

function conciseSubject(value: string) {
  const result = stripAttachmentMarker(value).replace(/\s+/g, " ").trim();
  if (!result) return "the task";
  return result.length > 110 ? `${result.slice(0, 107)}…` : result;
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function planResponse(subject: string, length: ResponseLength) {
  const base = [
    `A practical plan for ${subject}`,
    "1. Define the finish line. State what a useful result looks like in one sentence.",
    "2. List the smallest actions. Break the work into steps that can each be completed without switching context.",
    "3. Do the first action now. Set a short time box, remove one distraction, and capture any blockers.",
  ];
  if (length !== "brief") base.push("4. Review and adjust. Keep what worked, defer what did not, and choose the next smallest action.");
  if (length === "deep") base.push("\nReflection prompt: What evidence would show that this plan is moving the work forward?");
  return base.join("\n");
}

function researchResponse(subject: string, length: ResponseLength) {
  const rows = [
    `Offline research frame: ${subject}`,
    "Question: What specific decision or conclusion is this research meant to support?",
    "Known: Write down the facts already in your notes or conversation.",
    "Unknown: Separate assumptions from information that still needs a source.",
    "Next evidence: Identify the first document, person, or source you should check outside this offline workspace.",
  ];
  if (length === "deep") rows.push("Decision rule: Define what evidence would change your conclusion before you start collecting it.");
  return rows.join("\n");
}

function explainResponse(subject: string, mode: AgentMode, length: ResponseLength) {
  const opening = mode === "creative"
    ? "Here is a useful way to look at it from a few angles."
    : mode === "precise"
      ? "Here is the clearest answer this offline assistant can give from the information available."
      : "Here is a structured starting point based on what you shared.";
  const lines = [
    opening,
    `Topic: ${subject}`,
    "- Start by separating the goal from the constraints.",
    "- Turn the most important constraint into a decision rule.",
    "- Test one small action before committing to a larger solution.",
  ];
  if (length !== "brief") lines.push("\nIf you share the audience, deadline, and desired outcome, I can turn this into a more tailored outline.");
  return lines.join("\n");
}

function contextBlock(agent: LocalAgent) {
  const pieces: string[] = [];
  if (agent.memories.length) pieces.push(`I am keeping in mind: ${agent.memories.slice(0, 2).join("; ")}.`);
  if (agent.knowledge.length) pieces.push(`Relevant saved note: ${agent.knowledge[0]?.title} — ${compactPrompt(agent.knowledge[0]?.content || "")}`);
  return pieces.length ? `\n\n${pieces.join(" ")}` : "";
}

export function createOfflineResponse(agent: LocalAgent, messages: ConversationMessage[]): string {
  const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content || "";
  const subject = conciseSubject(lastUser);
  const lower = subject.toLowerCase();
  const { mode, responseLength } = agent.settings;

  if (/\[(?:[^\]]*\.(?:png|jpe?g|gif|webp|heic)|image[^\]]*)\]/i.test(lastUser)) {
    return `I can see that an attachment was selected, but this offline build does not analyse files or send them anywhere. I can still help if you describe what you want to do with it.${contextBlock(agent)}`;
  }
  if (hasAny(lower, ["hello", "hi ", "hey", "who are you", "what can you do"])) {
    return `I’m ${agent.name}, your private offline companion. I can help you structure a goal, work through ideas, and use the notes and memories saved in this browser. I do not use a model API, database, account, or web connection.\n\nTry asking me to plan a task, explain a topic using your supplied context, or turn an idea into next steps.${contextBlock(agent)}`;
  }
  if (hasAny(lower, ["plan", "schedule", "week", "todo", "to-do", "priorit", "next step", "routine"])) {
    return `${planResponse(subject, responseLength)}${contextBlock(agent)}`;
  }
  if (hasAny(lower, ["research", "compare", "evidence", "source", "investigat", "analysis"])) {
    return `${researchResponse(subject, responseLength)}${contextBlock(agent)}`;
  }
  if (hasAny(lower, ["calculate", "math", "equation", "percent", " + ", " - ", " * ", " / "])) {
    return `For arithmetic, open **Tools → Calculator** in this workspace. It evaluates only basic math in your browser and does not send the expression anywhere.${contextBlock(agent)}`;
  }
  return `${explainResponse(subject, mode, responseLength)}${contextBlock(agent)}`;
}
