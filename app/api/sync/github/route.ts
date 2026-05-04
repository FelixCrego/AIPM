import { NextResponse } from "next/server";

import { syncGithub } from "@/lib/github/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncGithub();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
