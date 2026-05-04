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
  return (
    <Card className="border-slate-200/80 bg-white/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
};
