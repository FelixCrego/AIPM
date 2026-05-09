"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  Check,
  Copy,
  ArrowLeft,
  ArrowRight,
  ListFilter,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Search,
  Send,
  Sparkles,
  Volume2,
  WandSparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type BacklogItem = {
  title: string;
  summary: string;
  estimate: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  column: "TODO" | "IN_PROGRESS" | "DONE";
  commands: string[];
};

type GeneratedBacklog = {
  projectName: string;
  overview: string;
  items: BacklogItem[];
};

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProjectOption = {
  id: string;
  name: string;
  repository?: {
    fullName: string;
    url: string;
    defaultBranch: string;
  } | null;
};

type CardExecutionReport = {
  status: "DONE";
  summary: string;
  implementationNotes: string[];
  testsRun: string[];
  filesChanged: string[];
  risks: string[];
};

type CardExecutionResult = {
  status: "DONE";
  report: CardExecutionReport;
  issueUrl?: string | null;
  issueError?: string | null;
};

const COLUMNS: Array<BacklogItem["column"]> = ["TODO", "IN_PROGRESS", "DONE"];
const STORAGE_KEY = "devpilot_voice_backlog_conversation_v1";
const PRIORITY_ORDER: BacklogItem["priority"][] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_FILTERS: Array<BacklogItem["priority"] | "ALL"> = ["ALL", ...PRIORITY_ORDER];
const COLUMN_LABELS: Record<BacklogItem["column"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};
const PRIORITY_TONES: Record<BacklogItem["priority"], string> = {
  CRITICAL: "border-rose-400/20 bg-rose-500/18 text-rose-100",
  HIGH: "border-orange-400/20 bg-orange-500/14 text-orange-100",
  MEDIUM: "border-violet-400/20 bg-violet-500/14 text-violet-100",
  LOW: "border-emerald-400/20 bg-emerald-500/14 text-emerald-100",
};

const emptyCardForm = {
  title: "",
  summary: "",
  estimate: "3 pts",
  priority: "MEDIUM" as BacklogItem["priority"],
  commands: [] as string[],
};

const cardExecutionKey = (item: BacklogItem) => `${item.title}\n${item.summary}`;

const getInitialConversationState = (): { messages: ConversationMessage[]; lastTranscript: string | null } => {
  if (typeof window === "undefined") {
    return { messages: [], lastTranscript: null };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { messages: [], lastTranscript: null };
    }

    const parsed = JSON.parse(raw) as { messages?: ConversationMessage[]; lastTranscript?: string };
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages
          .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
          .slice(-80)
      : [];
    const lastTranscript =
      typeof parsed.lastTranscript === "string" && parsed.lastTranscript.trim() ? parsed.lastTranscript.trim() : null;

    return { messages, lastTranscript };
  } catch {
    return { messages: [], lastTranscript: null };
  }
};

export function AIBacklogKanban({ projects = [] }: { projects?: ProjectOption[] }) {
  const [initialConversationState] = useState(getInitialConversationState);
  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>(initialConversationState.messages);
  const [backlog, setBacklog] = useState<GeneratedBacklog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReply, setPendingReply] = useState(false);
  const [extractingBacklog, setExtractingBacklog] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(initialConversationState.lastTranscript);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "ai">("manual");
  const [cardForm, setCardForm] = useState(emptyCardForm);
  const [aiCardPrompt, setAiCardPrompt] = useState("");
  const [cardError, setCardError] = useState<string | null>(null);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const effectiveSelectedProjectId = selectedProjectId || projects[0]?.id || "";
  const [runningCardKey, setRunningCardKey] = useState<string | null>(null);
  const [cardExecutionResults, setCardExecutionResults] = useState<Record<string, CardExecutionResult>>({});
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [backlogSearch, setBacklogSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<BacklogItem["priority"] | "ALL">("ALL");
  const [actionableOnly, setActionableOnly] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] = useState<BacklogItem["column"]>("TODO");
  const [copiedCommandsKey, setCopiedCommandsKey] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const realtimePeerRef = useRef<RTCPeerConnection | null>(null);
  const realtimeChannelRef = useRef<RTCDataChannel | null>(null);
  const assistantTranscriptRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const copiedCommandsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistConversation = (nextMessages: ConversationMessage[], transcript: string | null) => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages: nextMessages.slice(-80),
        lastTranscript: transcript ?? "",
      }),
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingReply]);



  useEffect(() => {
    persistConversation(messages, lastTranscript);
  }, [messages, lastTranscript]);

  useEffect(() => {
    return () => {
      realtimeChannelRef.current?.close();
      realtimePeerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
      }
      if (copiedCommandsTimeoutRef.current) {
        clearTimeout(copiedCommandsTimeoutRef.current);
      }
    };
  }, []);

  const grouped = useMemo(() => {
    const seed: Record<BacklogItem["column"], BacklogItem[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    if (!backlog) return seed;
    for (const item of backlog.items) {
      seed[item.column].push(item);
    }
    return seed;
  }, [backlog]);

  const backlogMetrics = useMemo(
    () => ({
      total: backlog?.items.length ?? 0,
      todo: grouped.TODO.length,
      inProgress: grouped.IN_PROGRESS.length,
      done: grouped.DONE.length,
    }),
    [backlog?.items.length, grouped],
  );

  const displayedBacklog: GeneratedBacklog = backlog ?? {
    projectName: "Project Kanban",
    overview: "Create TODO cards manually or extract tickets from an AI conversation.",
    items: [],
  };

  const normalizedSearch = backlogSearch.trim().toLowerCase();
  const filteredGrouped = useMemo(() => {
    const seed: Record<BacklogItem["column"], BacklogItem[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    if (!backlog) {
      return seed;
    }

    for (const item of backlog.items) {
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) {
        continue;
      }

      if (actionableOnly && item.column === "DONE") {
        continue;
      }

      if (normalizedSearch) {
        const searchable = `${item.title}\n${item.summary}\n${item.estimate}\n${item.priority}\n${item.commands.join("\n")}`.toLowerCase();
        if (!searchable.includes(normalizedSearch)) {
          continue;
        }
      }

      seed[item.column].push(item);
    }

    return seed;
  }, [actionableOnly, backlog, normalizedSearch, priorityFilter]);

  const filteredTotal = filteredGrouped.TODO.length + filteredGrouped.IN_PROGRESS.length + filteredGrouped.DONE.length;
  const hasActiveFilters = normalizedSearch.length > 0 || priorityFilter !== "ALL" || actionableOnly;
  const completionPercent = backlogMetrics.total === 0 ? 0 : Math.round((backlogMetrics.done / backlogMetrics.total) * 100);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === effectiveSelectedProjectId) ?? projects[0] ?? null,
    [effectiveSelectedProjectId, projects],
  );

  const resetCardForm = () => {
    setCreateMode("manual");
    setCardForm(emptyCardForm);
    setAiCardPrompt("");
    setCardError(null);
    setGeneratingCard(false);
  };

  const openNewTodoCard = () => {
    resetCardForm();
    setCreateCardOpen(true);
  };

  const addTodoCard = () => {
    const title = cardForm.title.trim();
    const summary = cardForm.summary.trim();

    if (!title || !summary) {
      setCardError("Add a title and summary before creating the card.");
      return;
    }

    const newItem: BacklogItem = {
      title,
      summary,
      estimate: cardForm.estimate.trim() || "3 pts",
      priority: cardForm.priority,
      column: "TODO",
      commands: cardForm.commands,
    };

    setBacklog((current) => {
      const base = current ?? {
        projectName: "Manual Kanban",
        overview: "Cards created directly from the TODO column.",
        items: [],
      };

      return {
        ...base,
        items: [newItem, ...base.items],
      };
    });
    setCreateCardOpen(false);
    resetCardForm();
  };

  const generateCardWithAi = async () => {
    const prompt = aiCardPrompt.trim();
    if (prompt.length < 8) {
      setCardError("Describe the card you want AI to generate.");
      return;
    }

    setGeneratingCard(true);
    setCardError(null);

    try {
      const response = await fetch("/api/ai/backlog/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          projectName: backlog?.projectName,
          overview: backlog?.overview,
          existingTitles: backlog?.items.map((item) => item.title) ?? [],
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to generate card");
      }

      const item = payload.item as BacklogItem;
      setCardForm({
        title: item.title,
        summary: item.summary,
        estimate: item.estimate,
        priority: item.priority,
        commands: item.commands ?? [],
      });
    } catch (generateError) {
      setCardError(generateError instanceof Error ? generateError.message : "Unable to generate card");
    } finally {
      setGeneratingCard(false);
    }
  };

  const completeCardWithAi = async (item: BacklogItem) => {
    const project = selectedProject;
    const key = cardExecutionKey(item);

    if (!project) {
      setExecutionError("Select a project before running the AI wand.");
      return;
    }

    if (!project.repository) {
      setExecutionError("Connect this project to a GitHub repository before running the AI wand.");
      return;
    }

    setRunningCardKey(key);
    setExecutionError(null);

    try {
      const response = await fetch("/api/ai/backlog/execute-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          card: item,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; result?: CardExecutionResult; error?: string }
        | null;

      if (!response.ok || !payload?.ok || !payload.result) {
        throw new Error(payload?.error ?? "AI card execution failed");
      }

      setCardExecutionResults((current) => ({
        ...current,
        [key]: payload.result!,
      }));

      setBacklog((current) => {
        const base = current ?? displayedBacklog;
        let moved = false;
        return {
          ...base,
          items: base.items.map((existing) => {
            if (!moved && cardExecutionKey(existing) === key) {
              moved = true;
              return { ...existing, column: "DONE" as const };
            }
            return existing;
          }),
        };
      });
    } catch (executeError) {
      setExecutionError(executeError instanceof Error ? executeError.message : "AI card execution failed");
    } finally {
      setRunningCardKey(null);
    }
  };

  const moveCardToColumn = (item: BacklogItem, targetColumn: BacklogItem["column"]) => {
    const sourceKey = cardExecutionKey(item);
    if (item.column === targetColumn) {
      return;
    }

    setBacklog((current) => {
      const base = current ?? displayedBacklog;
      let moved = false;
      return {
        ...base,
        items: base.items.map((existing) => {
          if (!moved && cardExecutionKey(existing) === sourceKey) {
            moved = true;
            return { ...existing, column: targetColumn };
          }
          return existing;
        }),
      };
    });
  };

  const clearBacklogFilters = () => {
    setBacklogSearch("");
    setPriorityFilter("ALL");
    setActionableOnly(false);
  };

  const getAdjacentColumn = (column: BacklogItem["column"], direction: -1 | 1): BacklogItem["column"] | null => {
    const columnIndex = COLUMNS.indexOf(column);
    if (columnIndex < 0) {
      return null;
    }
    return COLUMNS[columnIndex + direction] ?? null;
  };

  const copyCardCommands = async (item: BacklogItem) => {
    if (!item.commands.length) {
      return;
    }

    const key = cardExecutionKey(item);
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(item.commands.join("\n"));
      setCopiedCommandsKey(key);

      if (copiedCommandsTimeoutRef.current) {
        clearTimeout(copiedCommandsTimeoutRef.current);
      }
      copiedCommandsTimeoutRef.current = setTimeout(() => {
        setCopiedCommandsKey((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      setExecutionError("Unable to copy commands in this browser.");
    }
  };

  const speakText = async (text: string) => {
    const response = await fetch("/api/ai/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Voice response failed");
    }

    const audioBlob = await response.blob();
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
    }

    const url = URL.createObjectURL(audioBlob);
    currentAudioUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;
    await audio.play();
  };

  const sendTurn = async (input: string, options?: { fromVoice?: boolean }) => {
    const clean = input.trim();
    if (clean.length < 2) {
      setError("Please provide a bit more detail.");
      return;
    }

    setError(null);
    setPendingReply(true);
    setComposer("");

    const baseMessages = [...messages];
    const nextMessages: ConversationMessage[] = [...baseMessages, { role: "user", content: clean }];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/ai/voice/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: baseMessages,
          userMessage: clean,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Conversation failed");
      }

      const assistantReply = (payload.reply as string).trim();
      const updatedMessages: ConversationMessage[] = [...nextMessages, { role: "assistant", content: assistantReply }];
      setMessages(updatedMessages);

      if (options?.fromVoice) {
        setVoiceStatus("Voice response ready.");
      }

      if (options?.fromVoice && autoVoiceReply) {
        setVoiceStatus("Speaking...");
        await speakText(assistantReply);
        setVoiceStatus("Voice response ready.");
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Conversation failed");
      if (options?.fromVoice) {
        setVoiceStatus("Voice conversation failed.");
      }
    } finally {
      setPendingReply(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!pendingReply && !extractingBacklog && composer.trim().length >= 2) {
        void sendTurn(composer);
      }
    }
  };

  const extractBacklogFromConversation = async () => {
    const hasMessageHistory = messages.length > 0;
    const hasTranscript = !!lastTranscript?.trim();
    if (!hasMessageHistory && !hasTranscript) {
      setError("Speak at least one turn, then extract Kanban tickets.");
      return;
    }

    setError(null);
    setExtractingBacklog(true);

    try {
      const extractPayload = hasMessageHistory
        ? messages.slice(-40).map((message) => ({
            role: message.role,
            content: message.content.slice(0, 1200),
          }))
        : [{ role: "user", content: (lastTranscript ?? "").slice(0, 1200) }];

      const response = await fetch("/api/ai/backlog/from-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: extractPayload }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to extract backlog");
      }

      const generated = payload.backlog as GeneratedBacklog;
      setBacklog(generated);

      if (autoVoiceReply) {
        const summary = `I extracted ${generated.items.length} Kanban tickets for ${generated.projectName}.`;
        try {
          await speakText(summary);
        } catch {
          setVoiceStatus("Backlog extracted. Voice summary unavailable.");
        }
      }
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Unable to extract backlog");
    } finally {
      setExtractingBacklog(false);
    }
  };

  const appendRealtimeAssistantReply = () => {
    const content = assistantTranscriptRef.current.trim();
    if (!content) {
      return;
    }

    assistantTranscriptRef.current = "";
    setMessages((current) => [...current, { role: "assistant", content }]);
    setVoiceStatus("Live response ready.");
  };

  const handleRealtimeEvent = (event: MessageEvent) => {
    try {
      const payload = JSON.parse(event.data) as {
        type?: string;
        transcript?: string;
        delta?: string;
        error?: { message?: string };
      };

      if (payload.type === "input_audio_buffer.speech_started") {
        setVoiceStatus("Listening...");
        return;
      }

      if (payload.type === "input_audio_buffer.speech_stopped") {
        setVoiceStatus("Processing...");
        return;
      }

      if (payload.type === "conversation.item.input_audio_transcription.completed" && payload.transcript) {
        const transcript = payload.transcript.trim();
        setLastTranscript(transcript);
        setMessages((current) => [...current, { role: "user", content: transcript }]);
        return;
      }

      if (
        (payload.type === "response.audio_transcript.delta" || payload.type === "response.output_text.delta") &&
        payload.delta
      ) {
        assistantTranscriptRef.current += payload.delta;
        return;
      }

      if (payload.type === "response.audio_transcript.done" || payload.type === "response.done") {
        appendRealtimeAssistantReply();
        return;
      }

      if (payload.type === "error") {
        setError(payload.error?.message ?? "Realtime voice session failed");
        setVoiceStatus("Live voice failed.");
      }
    } catch {
      // Ignore non-JSON control messages from the realtime transport.
    }
  };

  const stopRecording = () => {
    realtimeChannelRef.current?.close();
    realtimeChannelRef.current = null;
    realtimePeerRef.current?.close();
    realtimePeerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.pause();
    assistantTranscriptRef.current = "";
    setRecording(false);
    setVoiceStatus("Live voice stopped.");
  };

  const startRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setError("Live voice is not supported in this browser.");
      return;
    }

    setError(null);
    setVoiceStatus("Starting live voice...");

    try {
      const sessionResponse = await fetch("/api/ai/voice/realtime-session", { method: "POST" });
      const sessionPayload = (await sessionResponse.json().catch(() => null)) as
        | { ok?: boolean; clientSecret?: string; model?: string; error?: string }
        | null;

      if (!sessionResponse.ok || !sessionPayload?.ok || !sessionPayload.clientSecret) {
        throw new Error(sessionPayload?.error ?? "Unable to start realtime voice session");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const peer = new RTCPeerConnection();
      realtimePeerRef.current = peer;

      const remoteAudio = new Audio();
      remoteAudio.autoplay = true;
      audioRef.current = remoteAudio;
      peer.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
      };

      for (const track of stream.getTracks()) {
        peer.addTrack(track, stream);
      }

      const dataChannel = peer.createDataChannel("oai-events");
      realtimeChannelRef.current = dataChannel;
      dataChannel.onopen = () => setVoiceStatus("Live voice connected.");
      dataChannel.onmessage = handleRealtimeEvent;
      dataChannel.onerror = () => setVoiceStatus("Live voice data channel failed.");

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      let sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionPayload.clientSecret}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok && (sdpResponse.status === 400 || sdpResponse.status === 404)) {
        sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(sessionPayload.model ?? "gpt-4o-realtime-preview")}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionPayload.clientSecret}`,
            "Content-Type": "application/sdp",
            "OpenAI-Beta": "realtime=v1",
          },
          body: offer.sdp,
        });
      }

      if (!sdpResponse.ok) {
        const body = await sdpResponse.text();
        throw new Error(body || `Realtime call failed: ${sdpResponse.status}`);
      }

      const answer = await sdpResponse.text();
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
      setRecording(true);
      setVoiceStatus("Live voice connected.");
    } catch (recordError) {
      stopRecording();
      setVoiceStatus("Live voice failed.");
      setError(recordError instanceof Error ? recordError.message : "Unable to start live voice");
    }
  };

  const renderColumn = (column: BacklogItem["column"]) => (
    <div key={column} className="space-y-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-white/76">{COLUMN_LABELS[column]}</h4>
          <Badge variant="outline" className="h-5 px-2 text-[0.62rem]">
            {filteredGrouped[column].length}
          </Badge>
        </div>
        {column === "TODO" ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={openNewTodoCard}
            title="Add TODO card"
            aria-label="Add TODO card"
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {filteredGrouped[column].length === 0 ? (
        <p className="rounded-[0.9rem] border border-dashed border-white/10 p-3 text-xs text-white/42">
          {hasActiveFilters ? "No cards match these filters." : "No cards yet."}
        </p>
      ) : null}
      {filteredGrouped[column].map((item, itemIndex) => {
        const executionKey = cardExecutionKey(item);
        const executionResult = cardExecutionResults[executionKey];
        const running = runningCardKey === executionKey;
        const leftColumn = getAdjacentColumn(column, -1);
        const rightColumn = getAdjacentColumn(column, 1);

        return (
          <article
            key={`${column}-${item.title}-${itemIndex}`}
            className="space-y-2 rounded-[0.9rem] border border-white/8 bg-black/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white">{item.title}</p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => leftColumn && moveCardToColumn(item, leftColumn)}
                  disabled={!leftColumn || runningCardKey !== null}
                  title="Move left"
                  aria-label="Move left"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => rightColumn && moveCardToColumn(item, rightColumn)}
                  disabled={!rightColumn || runningCardKey !== null}
                  title="Move right"
                  aria-label="Move right"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={executionResult ? "secondary" : "outline"}
                  size="icon-sm"
                  onClick={() => completeCardWithAi(item)}
                  disabled={runningCardKey !== null || !!executionResult}
                  title="Complete this card with AI"
                  aria-label="Complete this card with AI"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs whitespace-pre-line text-white/56">{item.summary}</p>
            {item.commands.length ? (
              <div className="space-y-1 rounded-md border border-white/10 bg-black/30 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/45">Codex CLI Commands</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void copyCardCommands(item)}
                    title="Copy commands"
                    aria-label="Copy commands"
                  >
                    {copiedCommandsKey === executionKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {item.commands.map((command) => (
                  <pre key={`${item.title}-${command}`} className="overflow-x-auto text-[11px] text-emerald-200">
                    <code>{command}</code>
                  </pre>
                ))}
              </div>
            ) : null}
            {executionResult ? (
              <div className="space-y-1 rounded-md border border-emerald-300/20 bg-emerald-500/10 p-2">
                <p className="text-[10px] uppercase tracking-widest text-emerald-100">AI completed and tested</p>
                <p className="text-xs text-emerald-50/80">{executionResult.report.summary}</p>
                {executionResult.report.testsRun.length ? (
                  <p className="text-[11px] text-emerald-100/70">
                    Tests: {executionResult.report.testsRun.slice(0, 3).join(", ")}
                  </p>
                ) : null}
                {executionResult.issueUrl ? (
                  <a
                    href={executionResult.issueUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-medium text-emerald-100 underline underline-offset-4"
                  >
                    GitHub record
                  </a>
                ) : null}
                {executionResult.issueError ? <p className="text-[11px] text-amber-200">{executionResult.issueError}</p> : null}
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <Badge className={PRIORITY_TONES[item.priority]}>{item.priority}</Badge>
              <span className="text-xs text-white/46">{item.estimate}</span>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Voice Conversation + Kanban Extraction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="space-y-1">
            <Label htmlFor="kanban-execution-project" className="text-xs uppercase tracking-widest text-white/48">
              Execution project
            </Label>
            <select
              id="kanban-execution-project"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="h-9 min-w-64 rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus-visible:border-emerald-300/40 focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              {projects.length === 0 ? <option value="">No projects</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          {selectedProject?.repository ? (
            <a
              href={selectedProject.repository.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-emerald-200 hover:text-emerald-100"
            >
              {selectedProject.repository.fullName}
            </a>
          ) : (
            <Badge variant="outline">Connect GitHub repo in Projects</Badge>
          )}
        </div>

        <div className="space-y-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              variant={recording ? "destructive" : "secondary"}
              disabled={pendingReply || extractingBacklog}
            >
              {recording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Live Voice
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start Live Voice
                </>
              )}
            </Button>

            <Button
              type="button"
              variant={autoVoiceReply ? "secondary" : "outline"}
              onClick={() => setAutoVoiceReply((prev) => !prev)}
              disabled={pendingReply || extractingBacklog}
            >
              <Volume2 className="h-4 w-4" />
              {autoVoiceReply ? "Voice Reply On" : "Voice Reply Off"}
            </Button>

            <Button
              type="button"
              onClick={extractBacklogFromConversation}
              disabled={pendingReply || extractingBacklog || (messages.length === 0 && !lastTranscript?.trim())}
            >
              <Sparkles className="h-4 w-4" />
              {extractingBacklog ? "Extracting..." : "Extract Kanban From Conversation"}
            </Button>

            {voiceStatus ? <Badge variant="outline">{voiceStatus}</Badge> : null}
          </div>

          {lastTranscript ? (
            <p className="text-xs text-white/58">
              Last transcript: <span className="text-white/80">{lastTranscript}</span>
            </p>
          ) : null}
        </div>

        <div className="h-72 space-y-3 overflow-y-auto rounded-[1rem] border border-white/8 bg-black/20 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-white/50">
              Start speaking or type a message. Have a normal conversation about goals, features, users, constraints, and rollout details.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-[0.9rem] px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto border border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                    : "mr-auto border border-white/8 bg-white/[0.04] text-white/80"
                }`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-widest opacity-60">
                  {message.role === "user" ? "You" : "DevPilot AI"}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            ))
          )}
          {pendingReply ? (
            <div className="mr-auto max-w-[90%] rounded-[0.9rem] border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-white/60">
              DevPilot AI is thinking...
            </div>
          ) : null}
          <div ref={chatEndRef} />
        </div>

        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Send a message to continue the conversation..."
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/46">Press Ctrl/Cmd + Enter to send instantly</p>
            <p className="text-xs text-white/46">{composer.trim().length} chars</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => sendTurn(composer)}
              disabled={pendingReply || extractingBacklog || composer.trim().length < 2}
            >
              <Send className="h-4 w-4" />
              Send Message
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMessages([]);
                setBacklog(null);
                setLastTranscript(null);
                setError(null);
                setVoiceStatus(null);
                setExecutionError(null);
                setCardExecutionResults({});
                setCopiedCommandsKey(null);
                clearBacklogFilters();
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(STORAGE_KEY);
                }
              }}
              disabled={pendingReply || extractingBacklog}
            >
              Clear Conversation
            </Button>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {executionError ? <p className="text-sm text-rose-300">{executionError}</p> : null}

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">{displayedBacklog.projectName}</h3>
              <p className="text-sm text-white/62">{displayedBacklog.overview}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Total {backlogMetrics.total}</Badge>
              <Badge variant="outline">In progress {backlogMetrics.inProgress}</Badge>
              <Badge className="border-emerald-400/20 bg-emerald-500/14 text-emerald-100">Done {backlogMetrics.done}</Badge>
            </div>
          </div>

          <div className="space-y-2 rounded-[1rem] border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3 text-xs text-white/56">
              <span>Board completion</span>
              <span>{completionPercent}% complete</span>
            </div>
            <div className="h-2 rounded-full bg-white/8">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,_#00ff85,_#8b5cf6)] transition-all duration-300"
                style={{ width: `${Math.max(completionPercent, backlogMetrics.total > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_170px_auto_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
              <Input
                value={backlogSearch}
                onChange={(event) => setBacklogSearch(event.target.value)}
                placeholder="Search cards by title, summary, estimate, or command"
                className="pl-9"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as BacklogItem["priority"] | "ALL")}
              className="h-10 rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus-visible:border-emerald-300/40 focus-visible:ring-3 focus-visible:ring-ring/40"
              aria-label="Filter by priority"
            >
              {PRIORITY_FILTERS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === "ALL" ? "All priorities" : priority}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant={actionableOnly ? "secondary" : "outline"}
              onClick={() => setActionableOnly((current) => !current)}
              className="justify-start md:justify-center"
            >
              <ListFilter className="h-4 w-4" />
              {actionableOnly ? "Actionable only" : "Include done"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={clearBacklogFilters}
              disabled={!hasActiveFilters}
              className="justify-start md:justify-center"
            >
              Clear filters
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs text-white/48">
            <span>
              Showing {filteredTotal} of {backlogMetrics.total} cards
            </span>
            {hasActiveFilters ? <span>Filters active</span> : null}
          </div>

          <div className="md:hidden">
            <Tabs value={activeMobileColumn} onValueChange={(value) => setActiveMobileColumn(value as BacklogItem["column"])}>
              <TabsList
                variant="line"
                className="w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/8 bg-black/25 p-1"
              >
                {COLUMNS.map((column) => (
                  <TabsTrigger key={column} value={column} className="min-w-[7rem]">
                    {COLUMN_LABELS[column]}
                    <span className="ml-1 text-[0.68rem] opacity-75">({filteredGrouped[column].length})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {COLUMNS.map((column) => (
                <TabsContent key={column} value={column} className="mt-3">
                  {renderColumn(column)}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="hidden gap-4 md:grid md:grid-cols-3">
            {COLUMNS.map((column) => renderColumn(column))}
          </div>
        </div>

        <Dialog open={createCardOpen} onOpenChange={setCreateCardOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create TODO card</DialogTitle>
              <DialogDescription>
                Add a card manually or use AI to draft the title, summary, estimate, priority, and commands.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-1">
                <Button
                  type="button"
                  variant={createMode === "manual" ? "secondary" : "ghost"}
                  onClick={() => setCreateMode("manual")}
                >
                  Manual
                </Button>
                <Button
                  type="button"
                  variant={createMode === "ai" ? "secondary" : "ghost"}
                  onClick={() => setCreateMode("ai")}
                >
                  <WandSparkles className="h-4 w-4" />
                  AI generated
                </Button>
              </div>

              {createMode === "ai" ? (
                <div className="space-y-2 rounded-xl border border-violet-400/18 bg-violet-500/8 p-3">
                  <Label htmlFor="ai-card-prompt">AI card prompt</Label>
                  <Textarea
                    id="ai-card-prompt"
                    rows={3}
                    placeholder="Describe the feature, bug, or task this TODO card should cover..."
                    value={aiCardPrompt}
                    onChange={(event) => setAiCardPrompt(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateCardWithAi}
                    disabled={generatingCard || aiCardPrompt.trim().length < 8}
                  >
                    {generatingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                    {generatingCard ? "Generating..." : "Generate card"}
                  </Button>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="todo-card-title">Title</Label>
                <Input
                  id="todo-card-title"
                  value={cardForm.title}
                  onChange={(event) => setCardForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Short implementation task"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="todo-card-summary">Summary</Label>
                <Textarea
                  id="todo-card-summary"
                  rows={5}
                  value={cardForm.summary}
                  onChange={(event) => setCardForm((current) => ({ ...current, summary: event.target.value }))}
                  placeholder="Goal, implementation notes, acceptance criteria, and verification..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="todo-card-estimate">Estimate</Label>
                  <Input
                    id="todo-card-estimate"
                    value={cardForm.estimate}
                    onChange={(event) => setCardForm((current) => ({ ...current, estimate: event.target.value }))}
                    placeholder="3 pts"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="todo-card-priority">Priority</Label>
                  <select
                    id="todo-card-priority"
                    value={cardForm.priority}
                    onChange={(event) =>
                      setCardForm((current) => ({
                        ...current,
                        priority: event.target.value as BacklogItem["priority"],
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus-visible:border-emerald-300/40 focus-visible:ring-3 focus-visible:ring-ring/40"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              {cardForm.commands.length ? (
                <div className="space-y-1 rounded-md border border-white/10 bg-black/30 p-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/45">AI Commands</p>
                  {cardForm.commands.map((command) => (
                    <pre key={command} className="overflow-x-auto text-[11px] text-emerald-200">
                      <code>{command}</code>
                    </pre>
                  ))}
                </div>
              ) : null}

              {cardError ? <p className="text-sm text-rose-300">{cardError}</p> : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateCardOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addTodoCard} disabled={generatingCard}>
                <Plus className="h-4 w-4" />
                Add card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
