"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type BillingSnapshot = {
  isStripeConfigured: boolean;
  isDemoMode: boolean;
  billing: {
    planName: string;
    subscriptionStatus: string;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
  };
};

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
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingPending, setBillingPending] = useState<"checkout" | "portal" | null>(null);
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

  useEffect(() => {
    let active = true;

    fetch("/api/billing/status")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Unable to load billing status");
        }
        return payload as BillingSnapshot;
      })
      .then((payload) => {
        if (active) {
          setBillingSnapshot(payload);
        }
      })
      .catch((error) => {
        if (active) {
          setBillingError(error instanceof Error ? error.message : "Unable to load billing status");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const onSubmit = form.handleSubmit(() => {
    // Local MVP settings mock save.
    alert("Settings saved locally for MVP demo mode.");
  });

  const openBillingUrl = async (path: "/api/billing/checkout" | "/api/billing/portal", action: "checkout" | "portal") => {
    setBillingError(null);
    setBillingPending(action);

    try {
      const response = await fetch(path, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open Stripe billing");
      }
      window.location.assign(payload.url as string);
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to open Stripe billing");
    } finally {
      setBillingPending(null);
    }
  };

  const billingDisabled = !billingSnapshot?.isStripeConfigured || billingSnapshot?.isDemoMode;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-white/50">Plan</p>
              <p className="font-medium text-white">{billingSnapshot?.billing.planName ?? "Loading..."}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-white/50">Status</p>
              <p className="font-medium text-white">{billingSnapshot?.billing.subscriptionStatus ?? "Loading..."}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-white/50">Renews</p>
              <p className="font-medium text-white">
                {billingSnapshot?.billing.currentPeriodEnd
                  ? new Date(billingSnapshot.billing.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          {billingDisabled ? (
            <p className="text-sm text-amber-200">
              Stripe billing is disabled until DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and STRIPE_WEBHOOK_SECRET are configured.
            </p>
          ) : null}
          {billingError ? <p className="text-sm text-rose-300">{billingError}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => openBillingUrl("/api/billing/checkout", "checkout")}
              disabled={billingDisabled || billingPending !== null}
            >
              {billingPending === "checkout" ? "Opening checkout..." : "Upgrade with Stripe"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openBillingUrl("/api/billing/portal", "portal")}
              disabled={billingDisabled || !billingSnapshot?.billing.stripeCustomerId || billingPending !== null}
            >
              {billingPending === "portal" ? "Opening portal..." : "Manage Billing"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
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
    </div>
  );
}
