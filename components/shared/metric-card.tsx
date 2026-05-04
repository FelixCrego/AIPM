import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const MetricCard = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: number | string;
  hint: string;
}) => {
  const tone =
    title.includes("Failed") || title.includes("Blocked")
      ? "text-rose-300 shadow-[0_0_28px_rgba(239,68,68,0.16)]"
      : title.includes("QA")
        ? "text-violet-200 shadow-[0_0_28px_rgba(139,92,246,0.18)]"
        : "text-emerald-300 shadow-[0_0_28px_rgba(0,255,133,0.12)]";

  return (
    <Card className="min-h-[150px] justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="hud-label text-white/38">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-semibold tracking-tight ${tone}`}>{value}</p>
        <p className="mt-2 max-w-[20ch] text-sm text-white/58">{hint}</p>
      </CardContent>
    </Card>
  );
};
