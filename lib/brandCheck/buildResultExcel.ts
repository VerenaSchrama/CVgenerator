import ExcelJS from "exceljs"
import { detectBrand } from "./detectBrand"
import type { PromptResults } from "./runModels"

const ARGB_YELLOW = "FFFFFF00"
const ARGB_RED = "FFFFC7C7"
const ARGB_HEADER = "FFD0D8E8"

interface ResultRow {
  prompt: string
  results: PromptResults
}

export async function buildResultExcel(
  rows: ResultRow[],
  brand: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Resultaten")

  sheet.columns = [
    { header: "Prompt", key: "prompt", width: 50 },
    { header: "GPT-4o", key: "gpt", width: 65 },
    { header: "Gemini", key: "gemini", width: 65 },
    { header: "Claude", key: "claude", width: 65 },
    { header: "GPT count", key: "gptCount", width: 12 },
    { header: "Gemini count", key: "geminiCount", width: 14 },
    { header: "Claude count", key: "claudeCount", width: 14 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ARGB_HEADER },
    }
    cell.alignment = { vertical: "middle" }
  })
  headerRow.height = 20

  const totals = { gpt: 0, gemini: 0, claude: 0 }
  const mentioned = { gpt: 0, gemini: 0, claude: 0 }

  for (const { prompt, results } of rows) {
    const gptText = results.gpt.text ?? `[FOUT: ${results.gpt.error}]`
    const geminiText = results.gemini.text ?? `[FOUT: ${results.gemini.error}]`
    const claudeText = results.claude.text ?? `[FOUT: ${results.claude.error}]`

    const gptMatch = detectBrand(gptText, brand)
    const geminiMatch = detectBrand(geminiText, brand)
    const claudeMatch = detectBrand(claudeText, brand)

    totals.gpt += gptMatch.count
    totals.gemini += geminiMatch.count
    totals.claude += claudeMatch.count
    if (gptMatch.found) mentioned.gpt++
    if (geminiMatch.found) mentioned.gemini++
    if (claudeMatch.found) mentioned.claude++

    const row = sheet.addRow({
      prompt,
      gpt: gptText,
      gemini: geminiText,
      claude: claudeText,
      gptCount: gptMatch.count,
      geminiCount: geminiMatch.count,
      claudeCount: claudeMatch.count,
    })

    row.height = 80

    row.getCell("prompt").alignment = { wrapText: true, vertical: "top" }

    const applyCell = (
      key: string,
      found: boolean,
      isError: boolean
    ) => {
      const cell = row.getCell(key)
      cell.alignment = { wrapText: true, vertical: "top" }
      if (isError) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ARGB_RED },
        }
      } else if (found) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: ARGB_YELLOW },
        }
      }
    }

    applyCell("gpt", gptMatch.found, !results.gpt.text)
    applyCell("gemini", geminiMatch.found, !results.gemini.text)
    applyCell("claude", claudeMatch.found, !results.claude.text)
  }

  // Summary sheet
  const summary = workbook.addWorksheet("Samenvatting")
  summary.columns = [
    { header: "Model", key: "model", width: 20 },
    { header: "Totaal vermeldingen", key: "total", width: 22 },
    { header: "Prompts met vermelding", key: "count", width: 24 },
    { header: "% prompts met vermelding", key: "pct", width: 26 },
  ]

  const summaryHeader = summary.getRow(1)
  summaryHeader.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ARGB_HEADER },
    }
  })

  const n = rows.length
  const pct = (x: number) =>
    n > 0 ? `${((x / n) * 100).toFixed(1)}%` : "0%"

  summary.addRow({ model: "GPT-4o", total: totals.gpt, count: mentioned.gpt, pct: pct(mentioned.gpt) })
  summary.addRow({ model: "Gemini 1.5 Pro", total: totals.gemini, count: mentioned.gemini, pct: pct(mentioned.gemini) })
  summary.addRow({ model: "Claude Sonnet", total: totals.claude, count: mentioned.claude, pct: pct(mentioned.claude) })
  summary.addRow({})
  summary.addRow({ model: `Merk: "${brand}"`, total: `Totaal prompts: ${n}` })

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}
