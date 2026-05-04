"use client";

import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingsValues = {
  organizationName: string;
  githubConnection: string;
  vercelConnection: string;
  openAiApiKey: string;
  qaRules: string;
  codingStandards: string;
  preferredPmStyle: string;
};

export default function SettingsPage() {
  const form = useForm<SettingsValues>({
    defaultValues: {
      organizationName: "DevPilot Internal",
      githubConnection: "Not connected",
      vercelConnection: "Not connected",
      openAiApiKey: "",
      qaRules: "Block merge when preview deployment fails; Require test updates for backend changes.",
      codingStandards: "TypeScript strict mode, clear acceptance criteria, regression checklist before release.",
      preferredPmStyle: "Weekly goals with daily AI assignment updates.",
    },
  });

  const onSubmit = form.handleSubmit(() => {
    // Local MVP settings mock save.
    alert("Settings saved locally for MVP demo mode.");
  });

  return (
    <Card className="border-slate-200 bg-white/85">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input id="organizationName" {...form.register("organizationName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="githubConnection">GitHub Connection</Label>
            <Input id="githubConnection" {...form.register("githubConnection")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vercelConnection">Vercel Connection</Label>
            <Input id="vercelConnection" {...form.register("vercelConnection")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openAiApiKey">OpenAI API Key</Label>
            <Input id="openAiApiKey" type="password" {...form.register("openAiApiKey")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="qaRules">QA Rules</Label>
            <Textarea id="qaRules" rows={4} {...form.register("qaRules")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="codingStandards">Coding Standards</Label>
            <Textarea id="codingStandards" rows={4} {...form.register("codingStandards")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="preferredPmStyle">Preferred Project Management Style</Label>
            <Textarea id="preferredPmStyle" rows={3} {...form.register("preferredPmStyle")} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save Settings</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
