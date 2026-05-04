import { Badge } from "@/components/ui/badge";

const toneClasses: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  CLOSED: "bg-slate-100 text-slate-700",
  MERGED: "bg-emerald-100 text-emerald-800",
  READY: "bg-emerald-100 text-emerald-800",
  ERROR: "bg-rose-100 text-rose-800",
  BLOCKED: "bg-rose-100 text-rose-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  TODO: "bg-slate-100 text-slate-700",
  CRITICAL: "bg-rose-100 text-rose-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-emerald-100 text-emerald-800",
};

export const StatusBadge = ({ value }: { value: string | null | undefined }) => {
  const text = value ?? "Unknown";
  return <Badge className={toneClasses[text] ?? "bg-slate-100 text-slate-800"}>{text.replaceAll("_", " ")}</Badge>;
};
