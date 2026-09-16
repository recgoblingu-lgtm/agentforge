import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, ChevronRight, Compass, Cpu, Layers3, Plus, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const examples = [
  "A patient study coach who helps me understand difficult topics and quizzes me without making me feel bad.",
  "A creative director who turns rough ideas into bold campaign concepts and gives honest feedback.",
  "A calm daily planner who helps me prioritize my life, remember what matters, and stay consistent.",
];

const accentClasses: Record<string, string> = {
  violet: "from-violet-500 to-fuchsia-500",
  cyan: "from-cyan-400 to-blue-500",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-pink-600",
  emerald: "from-emerald-400 to-teal-600",
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const agents = trpc.agents.list.useQuery(undefined, { enabled: Boolean(user) });
  const createAgent = trpc.agents.createFromPrompt.useMutation({
    onSuccess: (agent) => {
      if (agent) setLocation(`/agent/${agent.id}`);
    },
  });

  const handleCreate = () => {
    if (!prompt.trim()) return;
    if (!user) {
      startLogin();
      return;
    }
    createAgent.mutate({ prompt: prompt.trim() });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fbfaff] text-[#252238]">
      <header className="container flex h-20 items-center justify-between">
        <a href="/" className="flex items-center gap-3" aria-label="AgentForge home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#30225f] text-lg text-white shadow-[0_8px_20px_rgba(48,34,95,.22)]">✦</span>
          <span className="font-[Space_Grotesk] text-lg font-bold tracking-tight">AgentForge</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-[#6c6680] md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-[#30225f]">How it works</a>
          <a href="#features" className="transition-colors hover:text-[#30225f]">What you can add</a>
        </nav>
        <Button variant="outline" onClick={() => (user ? setLocation("/") : startLogin())} className="rounded-full border-[#ddd7f1] bg-white px-5 text-[#30225f] hover:bg-[#f1edff]">
          {user ? "Open studio" : "Sign in"}
        </Button>
      </header>

      <main>
        <section className="container grid gap-16 pb-20 pt-14 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pb-28 lg:pt-20">
          <div>
            <Badge className="mb-6 rounded-full border border-[#ded6ff] bg-[#f0ecff] px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] text-[#6a4fc4] hover:bg-[#f0ecff]">
              <Sparkles className="mr-2 size-3.5" /> The personal AI studio
            </Badge>
            <h1 className="max-w-3xl font-[Space_Grotesk] text-5xl font-semibold leading-[1.03] tracking-[-.055em] text-[#2b2250] sm:text-6xl lg:text-[5.35rem]">
              Make an AI that <span className="bg-gradient-to-r from-[#6c48dc] via-[#aa55c7] to-[#ec7c96] bg-clip-text text-transparent">feels like yours.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#6d6782]">
              Describe the personality you want. AgentForge turns your words into a thoughtful AI companion with its own workspace, memory, knowledge, tools, and voice.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3 text-sm text-[#77718c]">
              {["No coding", "No database keys", "Start free"].map((item) => (
                <span key={item} className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#e6f8ef] text-[#2b9a68]"><Check className="size-3" /></span>{item}</span>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-[2rem] border-[#e5defa] bg-white p-5 shadow-[0_24px_70px_rgba(82,63,143,.12)] sm:p-7">
            <div className="absolute -right-16 -top-16 size-44 rounded-full bg-[#eee8ff] blur-2xl" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-[#a09ab5]">Create your agent</p>
                  <p className="mt-1 text-sm text-[#716a86]">One prompt is all you need.</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f4f0ff] text-[#7452d1]"><WandSparkles className="size-5" /></div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I want an AI who..."
                className="min-h-[190px] resize-none rounded-2xl border-[#e5defa] bg-[#fcfbff] p-5 text-base leading-7 shadow-none placeholder:text-[#ada7bc] focus-visible:ring-[#a993e9]"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button key={example} onClick={() => setPrompt(example)} className="rounded-full border border-[#eee9fa] bg-[#faf9ff] px-3 py-1.5 text-left text-xs text-[#746d8a] transition hover:border-[#cfc0f7] hover:bg-[#f3efff] hover:text-[#5d43a2]">
                    Try an example
                  </button>
                ))}
              </div>
              <Button onClick={handleCreate} disabled={createAgent.isPending || !prompt.trim()} className="mt-5 h-12 w-full rounded-xl bg-[#30225f] text-sm font-semibold shadow-[0_10px_25px_rgba(48,34,95,.22)] hover:bg-[#45327f]">
                {createAgent.isPending ? "Shaping your agent…" : user ? "Create my AI agent" : "Sign in to create your agent"}
                <ArrowRight className="ml-2 size-4" />
              </Button>
              {createAgent.error && <p className="mt-3 text-center text-xs text-rose-600">Something went wrong. Please try again.</p>}
            </div>
          </Card>
        </section>

        <section id="how-it-works" className="border-y border-[#eee9f7] bg-white py-20">
          <div className="container">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a8dd3]">From idea to companion</p>
              <h2 className="mt-3 font-[Space_Grotesk] text-3xl font-semibold tracking-[-.035em] text-[#2b2250] sm:text-4xl">A simple studio for a surprisingly personal result.</h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { icon: Compass, number: "01", title: "Describe the vibe", text: "Tell AgentForge the name, attitude, and kind of help you want in everyday language." },
                { icon: Layers3, number: "02", title: "Make it yours", text: "Add notes, memories, voice, vision, and simple tools from one calm workspace." },
                { icon: Cpu, number: "03", title: "Start creating", text: "Chat with your agent, refine its personality, and keep every conversation in one place." },
              ].map(({ icon: Icon, number, title, text }) => (
                <Card key={number} className="rounded-3xl border-[#eee9f7] bg-[#fcfbff] p-7 shadow-none">
                  <div className="flex items-center justify-between"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#f0ecff] text-[#6a4fc4]"><Icon className="size-5" /></div><span className="font-[Space_Grotesk] text-sm font-semibold text-[#b0a9c3]">{number}</span></div>
                  <h3 className="mt-8 font-[Space_Grotesk] text-xl font-semibold text-[#302653]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#79728d]">{text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="container py-20">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a8dd3]">Your agent, expanded</p>
              <h2 className="mt-3 font-[Space_Grotesk] text-3xl font-semibold tracking-[-.035em] text-[#2b2250] sm:text-4xl">Everything you asked for, in one place.</h2>
              <p className="mt-5 max-w-md leading-7 text-[#77708a]">Start with a personality prompt, then grow your agent over time. The studio keeps the complicated parts behind a friendly interface.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["Custom personality", "Saved conversations", "Long-term memory", "Knowledge notes", "Voice input + read aloud", "Vision-ready uploads", "Calculator tool", "Calendar-ready space"].map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-2xl border border-[#eee9f7] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(82,63,143,.04)]"><span className="flex size-7 items-center justify-center rounded-lg bg-[#f0ecff] text-[#7253cb]"><Check className="size-3.5" /></span><span className="text-sm font-medium text-[#5b536f]">{feature}</span></div>
              ))}
            </div>
          </div>
        </section>

        {user && agents.data && agents.data.length > 0 && (
          <section className="container pb-24">
            <div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#9a8dd3]">Your studio</p><h2 className="mt-2 font-[Space_Grotesk] text-2xl font-semibold text-[#2b2250]">Pick up where you left off.</h2></div><button onClick={() => document.querySelector("textarea")?.focus()} className="flex items-center gap-1 text-sm font-semibold text-[#6544b7] hover:text-[#3b2780]">Create another <Plus className="size-4" /></button></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.data.map((agent) => (
                <button key={agent.id} onClick={() => setLocation(`/agent/${agent.id}`)} className="group rounded-3xl border border-[#eee9f7] bg-white p-5 text-left shadow-[0_8px_28px_rgba(82,63,143,.05)] transition hover:-translate-y-1 hover:border-[#d5c8f7] hover:shadow-[0_16px_35px_rgba(82,63,143,.12)]">
                  <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-xl text-white ${accentClasses[agent.accent] || accentClasses.violet}`}>{agent.icon}</div>
                  <div className="mt-5 flex items-center justify-between"><h3 className="font-[Space_Grotesk] text-lg font-semibold text-[#34285f]">{agent.name}</h3><ChevronRight className="size-4 text-[#a59cb9] transition group-hover:translate-x-1 group-hover:text-[#7452d1]" /></div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#79728d]">{agent.tagline}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[#eee9f7] bg-white py-8"><div className="container flex flex-col justify-between gap-3 text-sm text-[#8d879d] sm:flex-row"><span>AgentForge · Your ideas, made conversational.</span><span>Built for curious people.</span></div></footer>
    </div>
  );
}
