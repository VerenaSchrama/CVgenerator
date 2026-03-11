import ExcelJS from "exceljs"

export async function parsePrompts(
  buffer: ArrayBuffer,
  hasHeader: boolean
): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  // @ts-ignore -- exceljs types predate Node 20 Buffer<ArrayBufferLike>
  await workbook.xlsx.load(new Uint8Array(buffer))

  const sheet = workbook.worksheets[0]
  const prompts: string[] = []

  sheet.eachRow((row, rowNumber) => {
    if (hasHeader && rowNumber === 1) return
    const cell = row.getCell(1)
    const value = (cell.text ?? String(cell.value ?? "")).trim()
    if (value) prompts.push(value)
  })

  return prompts
}
