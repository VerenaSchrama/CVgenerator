import { Document, Paragraph, TextRun, Packer, HeadingLevel } from "docx"
import type { StructuredCV as CV } from "./types"

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  frameworks: "Frameworks",
  programming: "Programming",
  database: "Database",
  os: "OS",
  cloud: "Cloud",
  tools: "Tools",
  other: "Other",
}

function paragraph(
  text: string,
  opts?: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; bold?: boolean }
) {
  if (opts?.bold) {
    return new Paragraph({ children: [new TextRun({ text, bold: true })], heading: opts.heading })
  }
  return new Paragraph({ text, heading: opts?.heading })
}

function emptyLine(): Paragraph {
  return new Paragraph({ text: "" })
}

export async function buildDocxFromCv(cv: CV): Promise<Buffer> {
  const children: Paragraph[] = []

  children.push(paragraph(cv.name, { bold: true }))
  children.push(paragraph(cv.title))
  children.push(emptyLine())

  children.push(paragraph("Profile", { heading: HeadingLevel.HEADING_1 }))
  children.push(paragraph(cv.profile))
  children.push(emptyLine())

  children.push(paragraph("Technical skills", { heading: HeadingLevel.HEADING_1 }))
  const skillOrder = ["frameworks", "programming", "database", "os", "cloud", "tools", "other"] as const
  for (const cat of skillOrder) {
    const label = SKILL_CATEGORY_LABELS[cat] ?? cat
    const items = cv.technicalSkills[cat] ?? []
    if (items.length > 0) {
      children.push(paragraph(label, { heading: HeadingLevel.HEADING_2 }))
      children.push(paragraph(items.join(", ")))
    }
  }
  children.push(emptyLine())

  children.push(paragraph("Other projects", { heading: HeadingLevel.HEADING_1 }))
  for (const p of cv.projects) {
    children.push(paragraph(p.period, { heading: HeadingLevel.HEADING_2 }))
    const titleOrg = p.organization ? `${p.title} — ${p.organization}` : p.title
    children.push(paragraph(titleOrg))
    if (p.description) children.push(paragraph(p.description))
    children.push(emptyLine())
  }

  children.push(paragraph("Education", { heading: HeadingLevel.HEADING_1 }))
  for (const line of cv.education) {
    children.push(paragraph(line))
  }
  children.push(emptyLine())

  children.push(paragraph("Certifications", { heading: HeadingLevel.HEADING_1 }))
  for (const line of cv.certifications) {
    children.push(paragraph(line))
  }

  const doc = new Document({
    title: `${cv.name} – CV`,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
