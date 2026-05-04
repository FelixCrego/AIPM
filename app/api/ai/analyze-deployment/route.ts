import { NextResponse } from "next/server";

import { analyzeDeployment } from "@/lib/ai/deployment-analysis";
import { deploymentAnalysisRequestSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = deploymentAnalysisRequestSchema.parse(await request.json());
    const analysis = await analyzeDeployment(body.deploymentId);

    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
