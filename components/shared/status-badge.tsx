import { Badge } from "@/components/ui/badge";

const toneClasses: Record<string, string> = {
  OPEN: "border-amber-400/20 bg-amber-500/14 text-amber-100",
  CLOSED: "border-white/10 bg-white/[0.05] text-white/68",
  MERGED: "border-emerald-400/20 bg-emerald-500/14 text-emerald-100",
  READY: "border-emerald-400/20 bg-emerald-500/14 text-emerald-100",
  ERROR: "border-rose-400/20 bg-rose-500/16 text-rose-100",
  BLOCKED: "border-rose-400/20 bg-rose-500/16 text-rose-100",
  IN_PROGRESS: "border-sky-400/20 bg-sky-500/16 text-sky-100",
  TODO: "border-white/10 bg-white/[0.05] text-white/68",
  CRITICAL: "border-rose-400/20 bg-rose-500/16 text-rose-100",
  HIGH: "border-orange-400/20 bg-orange-500/14 text-orange-100",
  MEDIUM: "border-violet-400/20 bg-violet-500/14 text-violet-100",
  LOW: "border-emerald-400/20 bg-emerald-500/14 text-emerald-100",
  REQUEST_CHANGES: "border-rose-400/20 bg-rose-500/16 text-rose-100",
  NEEDS_QA: "border-violet-400/20 bg-violet-500/14 text-violet-100",
  IN_REVIEW: "border-sky-400/20 bg-sky-500/16 text-sky-100",
  QA: "border-violet-400/20 bg-violet-500/14 text-violet-100",
};

export const StatusBadge = ({ value }: { value: string | null | undefined }) => {
  const text = value ?? "Unknown";
  const key = text.toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
  return <Badge className={toneClasses[key] ?? "border-white/10 bg-white/[0.05] text-white/74"}>{text.replaceAll("_", " ")}</Badge>;
};
