import { NextResponse } from "next/server";

import { getDeveloperWorkload } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const developers = await getDeveloperWorkload();
    return NextResponse.json({ ok: true, developers });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
