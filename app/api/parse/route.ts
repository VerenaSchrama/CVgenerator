import { NextRequest, NextResponse } from "next/server"
import { parseCvFromBuffer } from "@/lib/parseCv"
import type { ParseResult } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json(
        { error: { code: "NO_FILE", message: "No file provided" } },
        { status: 400 }
      )
    }
    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: { code: "INVALID_TYPE", message: "Only DOCX files are accepted" } },
        { status: 400 }
      )
    }
    const buffer = await file.arrayBuffer()
    const result: ParseResult = await parseCvFromBuffer(buffer)
    if ("error" in result) {
      return NextResponse.json(result, { status: 422 })
    }
    return NextResponse.json({ cv: result })
  } catch (e) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Unexpected error", details: String(e) } },
      { status: 500 }
    )
  }
}
