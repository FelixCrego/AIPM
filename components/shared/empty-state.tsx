import { AlertCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <Card className="border-dashed border-white/12 bg-white/[0.03]">
    <CardContent className="flex items-start gap-3 py-8">
      <AlertCircle className="mt-0.5 h-5 w-5 text-white/36" />
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-white/56">{description}</p>
      </div>
    </CardContent>
  </Card>
);
