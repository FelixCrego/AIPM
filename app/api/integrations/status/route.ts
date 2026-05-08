import { NextResponse } from "next/server";

import { isDemoMode } from "@/lib/config";
import { getProviderToken } from "@/lib/integrations/credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const githubToken = await getProviderToken("github");
    const vercelToken = await getProviderToken("vercel");

    return NextResponse.json({
      ok: true,
      integrations: {
        github: {
          connected: Boolean(githubToken),
          mode: githubToken ? (isDemoMode ? "environment" : "oauth") : "disconnected",
        },
        vercel: {
          connected: Boolean(vercelToken),
          mode: vercelToken ? "environment" : "disconnected",
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
