import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Brain, Calculator, CalendarDays, Check, ChevronDown, FileText, ImagePlus, Lightbulb, Loader2, LogOut, Mic, Paperclip, Plus, Send, Settings2, Sparkles, Trash2, Volume2, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";

const accentClasses: Record<string, string> = {
  violet: "from-violet-500 to-fuchsia-500",
  cyan: "from-cyan-400 to-blue-500",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-pink-600",
  emerald: "from-emerald-400 to-teal-600",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

function formatTime(date: Date | string | number) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AgentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const agentId = Number(id);
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const agent = trpc.agents.get.useQuery({ id: agentId }, { enabled: Boolean(user && agentId) });
  const chatList = trpc.chat.list.useQuery({ agentId }, { enabled: Boolean(user && agentId) });
  const [chatId, setChatId] = useState<number | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const storedMessages = trpc.chat.messages.useQuery({ chatId: chatId as number }, { enabled: Boolean(chatId) });
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<string | undefined>();
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const [rightPanel, setRightPanel] = useState<"knowledge" | "memory" | "tools" | null>(null);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [calculatorInput, setCalculatorInput] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const notes = trpc.knowledge.list.useQuery({ agentId }, { enabled: Boolean(user && agentId) });
  const memory = trpc.memory.list.useQuery({ agentId }, { enabled: Boolean(user && agentId) });
  const addKnowledge = trpc.knowledge.add.useMutation({ onSuccess: () => { setKnowledgeTitle(""); setKnowledgeContent(""); notes.refetch(); } });
  const removeKnowledge = trpc.knowledge.remove.useMutation({ onSuccess: () => notes.refetch() });
  const addMemory = trpc.memory.add.useMutation({ onSuccess: () => { setMemoryContent(""); memory.refetch(); } });
  const removeMemory = trpc.memory.remove.useMutation({ onSuccess: () => memory.refetch() });
  const send = trpc.chat.send.useMutation({
    onSuccess: (result) => {
      setChatId(result.chatId);
      setMessages((current) => [...current, { role: "assistant", content: result.assistantMessage }]);
      chatList.refetch();
      storedMessages.refetch();
    },
  });

  useEffect(() => {
    if (storedMessages.data) setMessages(storedMessages.data.map((item) => ({ role: item.role, content: item.content })));
  }, [storedMessages.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, send.isPending]);

  const capabilities = useMemo(() => {
    if (!agent.data) return [];
    try { return JSON.parse(agent.data.capabilities) as string[]; } catch { return []; }
  }, [agent.data]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || send.isPending || !agent.data) return;
    setMessages((current) => [...current, { role: "user", content: attachmentName ? `${trimmed}\n[${attachmentName}]` : trimmed }]);
    send.mutate({ agentId, chatId, message: trimmed, imageDataUrl: attachment });
    setInput("");
    setAttachment(undefined);
    setAttachmentName(undefined);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setAttachment(String(reader.result)); setAttachmentName(file.name); };
    reader.readAsDataURL(file);
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setInput((current) => `${current}${current ? " " : ""}Voice input is not supported in this browser.`); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => setInput((current) => `${current}${current ? " " : ""}${event.results[0][0].transcript}`);
    recognition.start();
  };

  const calculate = () => {
    if (!calculatorInput.trim()) return;
    if (!/^[0-9+\-*/(). %]+$/.test(calculatorInput)) { setCalculatorResult("Only basic math is supported."); return; }
    try { setCalculatorResult(String(Function(`"use strict"; return (${calculatorInput})`)())); } catch { setCalculatorResult("Check the expression and try again."); }
  };

  if (!user) return <div className="flex min-h-screen items-center justify-center bg-[#fbfaff] text-[#5b536f]">Sign in to open this workspace.</div>;
  if (agent.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#fbfaff]"><Loader2 className="size-6 animate-spin text-[#7452d1]" /></div>;
  if (!agent.data) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fbfaff]"><p>We couldn’t find that agent.</p><Button onClick={() => setLocation("/")}>Back to studio</Button></div>;
  const currentAgent = agent.data;

  return (
    <div className="flex min-h-screen bg-[#f9f8fd] text-[#2b2540]">
      <aside className="hidden w-[280px] shrink-0 border-r border-[#e8e3f2] bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center justify-between border-b border-[#eeeaf5] px-5"><a href="/" className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-xl bg-[#30225f] text-sm text-white">✦</span><span className="font-[Space_Grotesk] font-bold tracking-tight text-[#30225f]">AgentForge</span></a><button onClick={() => setLocation("/")} className="rounded-lg p-2 text-[#9b94ad] hover:bg-[#f3f0fb] hover:text-[#5c42ab]" aria-label="Back to studio"><ArrowLeft className="size-4" /></button></div>
        <div className="border-b border-[#eeeaf5] p-5"><div className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white ${accentClasses[currentAgent.accent] || accentClasses.violet}`}>{currentAgent.icon}</div><h1 className="mt-4 font-[Space_Grotesk] text-xl font-semibold text-[#34285f]">{currentAgent.name}</h1><p className="mt-1 text-sm leading-5 text-[#827a95]">{currentAgent.tagline}</p><div className="mt-4 flex flex-wrap gap-1.5">{capabilities.slice(0, 3).map((capability) => <span key={capability} className="rounded-full bg-[#f3efff] px-2.5 py-1 text-[10px] font-semibold text-[#7253cb]">{capability}</span>)}</div></div>
        <div className="flex-1 overflow-y-auto p-4"><div className="mb-3 flex items-center justify-between px-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#aaa3b6]">Conversations</p><button onClick={() => { setChatId(undefined); setMessages([]); }} className="rounded-lg p-1.5 text-[#8068c5] hover:bg-[#f3efff]" aria-label="New conversation"><Plus className="size-4" /></button></div>{chatList.data?.length ? chatList.data.map((chat) => <button key={chat.id} onClick={() => { setChatId(chat.id); setMessages([]); }} className={`mb-1 w-full rounded-xl px-3 py-3 text-left text-sm transition ${chat.id === chatId ? "bg-[#f0ecff] font-semibold text-[#5d43a2]" : "text-[#736c83] hover:bg-[#faf8ff]"}`}><span className="block truncate">{chat.title}</span><span className="mt-1 block text-[10px] font-normal text-[#aaa3b6]">{formatTime(chat.updatedAt)}</span></button>) : <div className="rounded-2xl bg-[#faf9ff] p-4 text-xs leading-5 text-[#948da5]">Start a conversation and it will appear here.</div>}</div>
        <div className="border-t border-[#eeeaf5] p-4"><button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#847c95] hover:bg-[#faf8ff] hover:text-[#c34e6d]"><LogOut className="size-4" /> Sign out</button></div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-20 items-center justify-between border-b border-[#e8e3f2] bg-white/90 px-4 backdrop-blur sm:px-7"><div className="flex items-center gap-3"><button onClick={() => setLocation("/")} className="rounded-lg p-2 text-[#918aa2] hover:bg-[#f3f0fb] lg:hidden"><ArrowLeft className="size-4" /></button><div className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br text-lg text-white ${accentClasses[currentAgent.accent] || accentClasses.violet}`}>{currentAgent.icon}</div><div><p className="font-[Space_Grotesk] text-sm font-semibold text-[#34285f]">{currentAgent.name}</p><p className="text-xs text-[#9991a8]">Online · ready to help</p></div></div><div className="flex items-center gap-2"><Button onClick={() => setRightPanel(rightPanel === "knowledge" ? null : "knowledge")} variant="outline" size="sm" className={`hidden rounded-xl border-[#e7e0f7] bg-white text-[#6f5ab0] sm:flex ${rightPanel === "knowledge" ? "bg-[#f2edff]" : ""}`}><FileText className="mr-2 size-4" /> Knowledge</Button><Button onClick={() => setRightPanel(rightPanel === "memory" ? null : "memory")} variant="outline" size="sm" className={`hidden rounded-xl border-[#e7e0f7] bg-white text-[#6f5ab0] sm:flex ${rightPanel === "memory" ? "bg-[#f2edff]" : ""}`}><Brain className="mr-2 size-4" /> Memory</Button><button onClick={() => setRightPanel(rightPanel === "tools" ? null : "tools")} className="rounded-xl border border-[#e7e0f7] p-2 text-[#8068c5] hover:bg-[#f2edff]" aria-label="Open tools"><Settings2 className="size-4" /></button></div></header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-8 lg:py-9">
          {messages.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center"><div className={`flex size-20 items-center justify-center rounded-[1.7rem] bg-gradient-to-br text-4xl text-white shadow-[0_15px_30px_rgba(86,60,154,.18)] ${accentClasses[currentAgent.accent] || accentClasses.violet}`}>{currentAgent.icon}</div><h2 className="mt-7 font-[Space_Grotesk] text-3xl font-semibold tracking-[-.035em] text-[#34285f]">What are we creating today?</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#8a829c]">{currentAgent.tagline} Ask a question, share an idea, or give {currentAgent.name} something to remember.</p><div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-3">{["Help me plan my week", "Teach me something new", "Give me a creative spark"].map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)} className="rounded-2xl border border-[#e9e3f5] bg-white px-3 py-3 text-left text-xs text-[#746c88] shadow-[0_5px_18px_rgba(82,63,143,.04)] transition hover:border-[#cfc1f5] hover:bg-[#faf8ff]">{suggestion}<ChevronDown className="mt-2 size-3 rotate-[-90deg] text-[#ad9bd8]" /></button>)}</div></div> : <div className="space-y-6 pb-6">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}><Avatar className={`mt-1 size-8 shrink-0 ${message.role === "assistant" ? "bg-[#eee8ff]" : "bg-[#ebe7f3]"}`}><AvatarFallback className={message.role === "assistant" ? "bg-[#eee8ff] text-[#6f4dcc]" : "bg-[#ebe7f3] text-[#6e657c]"}>{message.role === "assistant" ? currentAgent.icon : (user.name || "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className={`max-w-[85%] rounded-3xl px-4 py-3.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-[#30225f] text-white" : "rounded-bl-md border border-[#e9e3f3] bg-white text-[#514a61] shadow-[0_7px_20px_rgba(82,63,143,.04)]"}`}>{message.role === "assistant" ? <><div className="prose prose-sm max-w-none text-[#514a61]"><Streamdown>{message.content}</Streamdown></div><button onClick={() => { if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(message.content)); }} className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[#9b8bbd] hover:text-[#6544b7]"><Volume2 className="size-3" /> Read aloud</button></> : <p className="whitespace-pre-wrap">{message.content}</p>}</div></div>)}{send.isPending && <div className="flex items-center gap-3 text-sm text-[#9a91a8]"><div className="flex size-8 items-center justify-center rounded-full bg-[#eee8ff] text-[#6f4dcc]">{currentAgent.icon}</div><span className="flex items-center gap-1">Thinking <span className="animate-pulse">···</span></span></div>}<div ref={bottomRef} /></div>}

          <div className="mt-auto rounded-3xl border border-[#e6def6] bg-white p-2 shadow-[0_14px_35px_rgba(82,63,143,.09)]"><div className="relative"><Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={`Message ${currentAgent.name}…`} className="min-h-[68px] resize-none border-0 bg-transparent px-3 py-2 text-sm leading-6 shadow-none focus-visible:ring-0" />{attachmentName && <div className="absolute bottom-2 left-3 flex items-center gap-2 rounded-lg bg-[#f3efff] px-2 py-1 text-[11px] text-[#6d52b6]"><ImagePlus className="size-3" /> {attachmentName}<button onClick={() => { setAttachment(undefined); setAttachmentName(undefined); }}><X className="size-3" /></button></div>}</div><div className="flex items-center justify-between border-t border-[#f0edf6] px-2 pt-2"><div className="flex items-center gap-1"><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} /><button onClick={() => fileRef.current?.click()} className="rounded-lg p-2 text-[#9d95ab] hover:bg-[#f5f1fc] hover:text-[#7452d1]" aria-label="Attach image"><Paperclip className="size-4" /></button><button onClick={startVoice} className={`rounded-lg p-2 text-[#9d95ab] hover:bg-[#f5f1fc] hover:text-[#7452d1] ${listening ? "bg-[#feecef] text-[#cc5e7a]" : ""}`} aria-label="Voice input"><Mic className="size-4" /></button><button onClick={() => setRightPanel("tools")} className="rounded-lg p-2 text-[#9d95ab] hover:bg-[#f5f1fc] hover:text-[#7452d1]" aria-label="Open tools"><Sparkles className="size-4" /></button></div><Button onClick={handleSend} disabled={!input.trim() || send.isPending} size="icon" className="size-9 rounded-xl bg-[#30225f] hover:bg-[#45327f]"><Send className="size-4" /></Button></div></div>
        </div>
      </main>

      {rightPanel && <aside className="fixed inset-y-0 right-0 z-20 w-full max-w-sm border-l border-[#e8e3f2] bg-white shadow-[-15px_0_40px_rgba(82,63,143,.08)] sm:static sm:flex sm:w-[320px] sm:shrink-0 sm:shadow-none"><div className="flex h-full w-full flex-col"><div className="flex items-center justify-between border-b border-[#eeeaf5] px-5 py-5"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#aaa3b6]">Agent powers</p><h3 className="mt-1 font-[Space_Grotesk] text-lg font-semibold text-[#34285f]">{rightPanel === "knowledge" ? "Knowledge" : rightPanel === "memory" ? "Memory" : "Tools"}</h3></div><button onClick={() => setRightPanel(null)} className="rounded-lg p-2 text-[#9a91a8] hover:bg-[#f6f3fb]"><X className="size-4" /></button></div>
        <div className="flex-1 overflow-y-auto p-5">
          {rightPanel === "knowledge" && <div className="space-y-5"><div className="rounded-2xl bg-[#faf8ff] p-4"><p className="text-sm font-semibold text-[#5d43a2]">Give {currentAgent.name} reference material</p><p className="mt-1 text-xs leading-5 text-[#948ca4]">Paste notes, rules, project context, or anything you want your agent to know.</p><Input value={knowledgeTitle} onChange={(e) => setKnowledgeTitle(e.target.value)} placeholder="Note title" className="mt-4 h-9 border-[#e5def6] bg-white text-xs" /><Textarea value={knowledgeContent} onChange={(e) => setKnowledgeContent(e.target.value)} placeholder="Write or paste a note…" className="mt-2 min-h-[100px] resize-none border-[#e5def6] bg-white text-xs" /><Button onClick={() => addKnowledge.mutate({ agentId, title: knowledgeTitle || "Untitled note", content: knowledgeContent })} disabled={!knowledgeContent.trim() || addKnowledge.isPending} size="sm" className="mt-2 w-full rounded-xl bg-[#6c4fc4]">{addKnowledge.isPending ? "Saving…" : "Add knowledge"}</Button></div>{notes.data?.map((note) => <div key={note.id} className="rounded-2xl border border-[#eee9f7] p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><FileText className="size-4 text-[#8066ca]" /><p className="text-sm font-semibold text-[#554a70]">{note.title}</p></div><button onClick={() => removeKnowledge.mutate({ id: note.id })} className="text-[#b0a6bb] hover:text-rose-500"><Trash2 className="size-3.5" /></button></div><p className="mt-2 line-clamp-4 text-xs leading-5 text-[#8a8297]">{note.content}</p></div>)}{!notes.data?.length && <p className="text-center text-xs text-[#9a91a8]">No notes yet.</p>}</div>}
          {rightPanel === "memory" && <div className="space-y-5"><div className="rounded-2xl bg-[#fff8e9] p-4"><div className="flex items-center gap-2"><Brain className="size-4 text-[#c18525]" /><p className="text-sm font-semibold text-[#745322]">Long-term memory</p></div><p className="mt-1 text-xs leading-5 text-[#9b815d]">Add a preference or fact your agent should remember across chats.</p><Textarea value={memoryContent} onChange={(e) => setMemoryContent(e.target.value)} placeholder="Remember that I…" className="mt-4 min-h-[90px] resize-none border-[#f3dfb5] bg-white text-xs" /><Button onClick={() => addMemory.mutate({ agentId, content: memoryContent })} disabled={!memoryContent.trim() || addMemory.isPending} size="sm" className="mt-2 w-full rounded-xl bg-[#c4862b] hover:bg-[#a96e1d]">{addMemory.isPending ? "Saving…" : "Save memory"}</Button></div>{memory.data?.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#f0e6d1] bg-[#fffdf8] p-4"><p className="text-xs leading-5 text-[#76664e]">{item.content}</p><button onClick={() => removeMemory.mutate({ id: item.id })} className="text-[#b9a78c] hover:text-rose-500"><Trash2 className="size-3.5" /></button></div>)}{!memory.data?.length && <p className="text-center text-xs text-[#9a91a8]">No memories saved yet.</p>}</div>}
          {rightPanel === "tools" && <div className="space-y-4"><div className="rounded-2xl border border-[#eee9f7] p-4"><div className="flex items-center gap-2"><Calculator className="size-4 text-[#6d55bd]" /><p className="text-sm font-semibold text-[#554a70]">Calculator</p></div><p className="mt-1 text-xs text-[#9a91a8]">Quick math without leaving your workspace.</p><div className="mt-3 flex gap-2"><Input value={calculatorInput} onChange={(e) => setCalculatorInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && calculate()} placeholder="120 / 4 + 6" className="h-9 text-xs" /><Button onClick={calculate} size="sm" className="h-9 rounded-lg bg-[#6c4fc4]">Go</Button></div>{calculatorResult && <p className="mt-3 rounded-lg bg-[#f4f0ff] px-3 py-2 text-sm font-semibold text-[#5d43a2]">= {calculatorResult}</p>}</div><div className="rounded-2xl border border-[#eee9f7] p-4"><div className="flex items-center gap-2"><CalendarDays className="size-4 text-[#4f9d8a]" /><p className="text-sm font-semibold text-[#554a70]">Calendar</p></div><p className="mt-1 text-xs leading-5 text-[#9a91a8]">A space for scheduling integrations. Your agent can already help you plan; calendar sync can be connected next.</p><Button variant="outline" size="sm" onClick={() => setInput("Help me plan a calendar for this week") } className="mt-3 w-full rounded-xl border-[#dceee7] text-[#4f8d7d]">Draft a plan</Button></div><div className="rounded-2xl bg-[#f7f3ff] p-4"><div className="flex items-center gap-2"><Lightbulb className="size-4 text-[#8066ca]" /><p className="text-sm font-semibold text-[#5d43a2]">Tip</p></div><p className="mt-2 text-xs leading-5 text-[#817699]">Use the paperclip to attach an image. Vision support is ready for your agent.</p></div></div>}
        </div></div></aside>}
    </div>
  );
}
