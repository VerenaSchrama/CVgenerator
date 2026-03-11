import { NextRequest, NextResponse } from "next/server"
import { parsePrompts } from "@/lib/brandCheck/parsePrompts"
import { runAllModels } from "@/lib/brandCheck/runModels"
import { buildResultExcel } from "@/lib/brandCheck/buildResultExcel"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const form = await req.formData()

  const file = form.get("file") as File | null
  const brand = (form.get("brand") as string | null)?.trim()
  const hasHeader = form.get("hasHeader") === "true"

  if (!file || !brand) {
    return NextResponse.json(
      { error: "Bestand en merknaam zijn verplicht" },
      { status: 400 }
    )
  }

  const openaiKey =
    ((form.get("openaiKey") as string) || "").trim() ||
    process.env.OPENAI_API_KEY ||
    ""
  const geminiKey =
    ((form.get("geminiKey") as string) || "").trim() ||
    process.env.GEMINI_API_KEY ||
    ""
  const anthropicKey =
    ((form.get("anthropicKey") as string) || "").trim() ||
    process.env.ANTHROPIC_API_KEY ||
    ""

  const missing = [
    !openaiKey && "OpenAI",
    !geminiKey && "Gemini",
    !anthropicKey && "Anthropic",
  ].filter(Boolean)

  if (missing.length) {
    return NextResponse.json(
      { error: `Ontbrekende API keys: ${missing.join(", ")}` },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const prompts = await parsePrompts(arrayBuffer, hasHeader)

  if (!prompts.length) {
    return NextResponse.json(
      { error: "Geen prompts gevonden in het Excel-bestand (kolom A)" },
      { status: 400 }
    )
  }

  const rows: { prompt: string; results: Awaited<ReturnType<typeof runAllModels>> }[] = []
  for (const prompt of prompts) {
    const results = await runAllModels(prompt, {
      openai: openaiKey,
      gemini: geminiKey,
      anthropic: anthropicKey,
    })
    rows.push({ prompt, results })
  }

  const resultBuffer = await buildResultExcel(rows, brand)

  return new NextResponse(new Uint8Array(resultBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="brand-check-resultaten.xlsx"`,
    },
  })
}
