"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Volume2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type BacklogItem = {
  title: string;
  summary: string;
  estimate: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  column: "TODO" | "IN_PROGRESS" | "DONE";
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

const COLUMNS: Array<BacklogItem["column"]> = ["TODO", "IN_PROGRESS", "DONE"];
const STORAGE_KEY = "devpilot_voice_backlog_conversation_v1";

const mediaMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
};

export function AIBacklogKanban() {
  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [backlog, setBacklog] = useState<GeneratedBacklog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReply, setPendingReply] = useState(false);
  const [extractingBacklog, setExtractingBacklog] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentAudioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const buildLocalBacklog = (inputMessages: ConversationMessage[], transcript: string | null): GeneratedBacklog => {
    const seedText = [
      ...inputMessages.map((message) => message.content),
      transcript ?? "",
    ]
      .join(". ")
      .replaceAll(/\s+/g, " ")
      .trim();

    const lines = seedText
      .split(/[.!?;\n]+/g)
      .map((line) => line.trim())
      .filter((line) => line.length > 16)
      .slice(0, 8);

    const selected = lines.length ? lines : ["Clarify project scope, users, and acceptance criteria from the planning conversation."];
    const items: BacklogItem[] = selected.map((line, index) => {
      const words = line.split(" ").filter(Boolean);
      const title = words.slice(0, 7).join(" ").replace(/^\w/, (c) => c.toUpperCase()) || `Conversation task ${index + 1}`;
      const lower = line.toLowerCase();
      const priority: BacklogItem["priority"] =
        /(auth|security|payment|database|deploy|api|critical)/.test(lower)
          ? "HIGH"
          : /(voice|chat|workflow|dashboard|feature)/.test(lower)
            ? "MEDIUM"
            : "LOW";
      const column: BacklogItem["column"] = index < 4 ? "TODO" : index < 7 ? "IN_PROGRESS" : "DONE";
      const estimate = priority === "HIGH" ? "5 pts" : priority === "MEDIUM" ? "3 pts" : "2 pts";

      return {
        title,
        summary: line,
        estimate,
        priority,
        column,
      };
    });

    while (items.length < 5) {
      items.push({
        title: `Conversation follow-up ${items.length + 1}`,
        summary: "Capture missing details from the voice discussion and convert into actionable acceptance criteria.",
        estimate: "2 pts",
        priority: "MEDIUM",
        column: items.length < 3 ? "TODO" : "IN_PROGRESS",
      });
    }

    return {
      projectName: "Voice Conversation Backlog",
      overview: "Kanban extracted from your latest voice planning conversation.",
      items: items.slice(0, 14),
    };
  };

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
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { messages?: ConversationMessage[]; lastTranscript?: string };
      if (Array.isArray(parsed.messages)) {
        setMessages(
          parsed.messages
            .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
            .slice(-80),
        );
      }
      if (typeof parsed.lastTranscript === "string" && parsed.lastTranscript.trim()) {
        setLastTranscript(parsed.lastTranscript.trim());
      }
    } catch {
      // Ignore corrupt local cache and continue with fresh state.
    }
  }, []);

  useEffect(() => {
    persistConversation(messages, lastTranscript);
  }, [messages, lastTranscript]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      audioRef.current?.pause();
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
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

  const transcribeRecording = async (blob: Blob) => {
    const form = new FormData();
    const fileType = blob.type || "audio/webm";
    form.append("audio", new File([blob], "voice-backlog-input.webm", { type: fileType }));

    const response = await fetch("/api/ai/voice/transcribe", {
      method: "POST",
      body: form,
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? "Transcription failed");
    }

    return payload.transcript as string;
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
      const localBacklog = buildLocalBacklog(messages, lastTranscript);
      setBacklog(localBacklog);
      setError("API extraction failed, generated cards from local conversation transcript.");
    } finally {
      setExtractingBacklog(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      return;
    }
    recorder.stop();
  };

  const startRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice capture is not supported in this browser.");
      return;
    }

    setError(null);
    setVoiceStatus("Listening...");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, mediaMimeType() ? { mimeType: mediaMimeType() } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const recordingBlob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];

        try {
          setVoiceStatus("Transcribing...");
          const transcript = await transcribeRecording(recordingBlob);
          setLastTranscript(transcript);

          setVoiceStatus("Sending to conversation...");
          await sendTurn(transcript, { fromVoice: true });
        } catch (transcribeError) {
          setVoiceStatus("Voice flow failed.");
          setError(transcribeError instanceof Error ? transcribeError.message : "Voice processing failed");
        }
      };

      recorder.start();
      setRecording(true);
    } catch (recordError) {
      setVoiceStatus("Microphone unavailable.");
      setError(recordError instanceof Error ? recordError.message : "Unable to start recording");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Voice Conversation + Kanban Extraction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  Stop Voice Capture
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Talk to AI
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
          />
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

        {backlog ? (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-white">{backlog.projectName}</h3>
              <p className="text-sm text-white/62">{backlog.overview}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {COLUMNS.map((column) => (
                <div key={column} className="space-y-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
                  <h4 className="text-sm font-semibold text-white/76">{column.replaceAll("_", " ")}</h4>
                  {grouped[column].map((item) => (
                    <article key={`${column}-${item.title}`} className="space-y-2 rounded-[0.9rem] border border-white/8 bg-black/20 p-3">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs whitespace-pre-line text-white/56">{item.summary}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{item.priority}</Badge>
                        <span className="text-xs text-white/46">{item.estimate}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
