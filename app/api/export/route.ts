import { NextRequest, NextResponse } from "next/server"
import { buildDocxFromCv } from "@/lib/buildDocx"
import type { StructuredCV } from "@/lib/types"

function safeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_\u00C0-\u024F]/g, "")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 80) || "cv"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cv = body?.cv as StructuredCV | undefined
    if (!cv || typeof cv.name !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "cv object with name required" } },
        { status: 400 }
      )
    }
    const buffer = await buildDocxFromCv(cv)
    const filename = `${safeFilename(cv.name)}_tailored.docx`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: { code: "EXPORT_ERROR", message: "Failed to build DOCX", details: String(e) } },
      { status: 500 }
    )
  }
}
