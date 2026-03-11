import { NextRequest, NextResponse } from "next/server"
import { tailorCv } from "@/lib/tailorCv"
import { rewriteProfile } from "@/lib/rewriteWithAi"
import type { StructuredCV } from "@/lib/types"

type GenerateInput = {
  cv: StructuredCV
  roleDescription: string
  focus?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateInput = await request.json()
    const { cv, roleDescription, focus } = body
    if (!cv || !roleDescription) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "cv and roleDescription required" } },
        { status: 400 }
      )
    }
    const { tailored, meta, warnings } = tailorCv(cv, roleDescription, focus)

    const rewriteResult = await rewriteProfile(
      tailored.profile,
      roleDescription,
      focus
    )
    if (rewriteResult.ok) {
      tailored.profile = rewriteResult.profile
    } else {
      warnings.push({
        code: "AI_PROFILE_REWRITE_SKIPPED",
        message: "Profieltekst is niet door AI herschreven.",
        details: rewriteResult.error,
      })
    }

    return NextResponse.json({
      original: cv,
      tailored,
      meta,
      warnings,
    })
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Unexpected error", details: String(e) } },
      { status: 500 }
    )
  }
}
