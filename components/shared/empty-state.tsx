import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="border-dashed border-slate-300 bg-white/70">
    <CardContent className="flex items-start gap-3 py-8">
      <AlertCircle className="mt-0.5 h-5 w-5 text-slate-400" />
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </CardContent>
  </Card>
);
