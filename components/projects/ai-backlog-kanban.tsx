"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

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

const COLUMNS: Array<BacklogItem["column"]> = ["TODO", "IN_PROGRESS", "DONE"];

const mediaMimeType = () => {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const candidates = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
};

export function AIBacklogKanban() {
  const [prompt, setPrompt] = useState("");
  const [backlog, setBacklog] = useState<GeneratedBacklog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const currentAudioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const speakBacklogSummary = async (generated: GeneratedBacklog) => {
    const topItems = generated.items.slice(0, 3).map((item) => item.title).join(", ");
    const voiceSummary = `${generated.projectName}. ${generated.overview}. Top backlog cards: ${topItems}.`;

    const response = await fetch("/api/ai/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: voiceSummary }),
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

  const generateBacklog = async (customPrompt?: string, options?: { fromVoice?: boolean }) => {
    const effectivePrompt = customPrompt ?? prompt;
    if (effectivePrompt.trim().length < 20) {
      setError("Please share a bit more detail to generate backlog cards.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to generate backlog");
      }

      const generated = payload.backlog as GeneratedBacklog;
      setBacklog(generated);

      if (options?.fromVoice && autoVoiceReply) {
        setVoiceStatus("Speaking card summary...");
        await speakBacklogSummary(generated);
      }

      if (options?.fromVoice) {
        setVoiceStatus("Voice backlog generated.");
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong");
      if (options?.fromVoice) {
        setVoiceStatus("Voice flow failed.");
      }
    } finally {
      setLoading(false);
    }
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
          setPrompt((prev) => (prev.trim() ? `${prev.trim()}\n${transcript}` : transcript));

          setVoiceStatus("Generating backlog cards...");
          await generateBacklog(transcript, { fromVoice: true });
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
        <CardTitle>AI-Assisted Backlog Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              variant={recording ? "destructive" : "secondary"}
              disabled={loading}
            >
              {recording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Voice Capture
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start Voice Backlog Chat
                </>
              )}
            </Button>
            <Button
              type="button"
              variant={autoVoiceReply ? "secondary" : "outline"}
              onClick={() => setAutoVoiceReply((prev) => !prev)}
              disabled={loading}
            >
              <Volume2 className="h-4 w-4" />
              {autoVoiceReply ? "Voice Reply On" : "Voice Reply Off"}
            </Button>
            {voiceStatus ? <Badge variant="outline">{voiceStatus}</Badge> : null}
          </div>
          {lastTranscript ? (
            <p className="text-xs text-white/58">
              Last transcript: <span className="text-white/80">{lastTranscript}</span>
            </p>
          ) : null}
        </div>

        <Textarea
          rows={4}
          placeholder="Describe your app idea, target users, and must-have features..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <Button onClick={() => generateBacklog()} disabled={loading || prompt.length < 20}>
          {loading ? "Generating backlog..." : "Build Kanban backlog with AI"}
        </Button>
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
                      <p className="text-xs text-white/56">{item.summary}</p>
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
