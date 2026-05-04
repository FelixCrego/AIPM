"use client";

import { useMemo, useState } from "react";

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

export function AIBacklogKanban() {
  const [prompt, setPrompt] = useState("");
  const [backlog, setBacklog] = useState<GeneratedBacklog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const seed: Record<BacklogItem["column"], BacklogItem[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    if (!backlog) return seed;
    for (const item of backlog.items) {
      seed[item.column].push(item);
    }
    return seed;
  }, [backlog]);

  const generateBacklog = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to generate backlog");
      }
      setBacklog(payload.backlog as GeneratedBacklog);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI-Assisted Backlog Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={4}
          placeholder="Describe your app idea, target users, and must-have features..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <Button onClick={generateBacklog} disabled={loading || prompt.length < 20}>
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
