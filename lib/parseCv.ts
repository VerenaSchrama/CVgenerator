import mammoth from "mammoth"
import type { ParseResult, StructuredCV } from "./types"

const CERT_HEADINGS = ["Certificering", "Certifications"]
const TECH_SUBSECTIONS = [
  "Frameworks",
  "Programming",
  "Database",
  "OS",
  "Cloud",
  "Tools",
  "Other",
] as const
const YEAR_RANGE_REGEX = /\d{4}\s*-\s*\d{4}/
const EDUCATION_KEYWORDS = /\b(MSc|BSc|BA|MA|PhD|MBA|Master|Bachelor)\b/i

/** Max length for a line to be treated as a role header (Title - Organization) */
const ROLE_HEADER_MAX_LEN = 120
/** Pattern: title - organization (hyphen or en-dash, optional space before, space after) */
const ROLE_HEADER_DASH = /\s*[-–]\s+/
/** Mammoth sometimes concatenates "Organization" + "Next role title" without space. Insert boundary. */
const ORG_NEXT_TITLE_BOUNDARY = /\bUnilever(?=Consumer|Sustainability|Category)/gi
/** Next-role titles used to split a segment that starts with description (belongs to previous role) + next role. */
const NEXT_ROLE_TITLE_PATTERN = /(Consumer\s*&\s*Market\s*Analytics\s*Manager|Sustainability\s*Partnerships\s*Manager|Category,\s*Strategy\s*&\s*Insights\s*Manager)/

function splitByCommaOutsideParens(text: string): string[] {
  const result: string[] = []
  const parts = text.split(/\n/)
  for (const part of parts) {
    let current = ""
    let depth = 0
    for (const c of part) {
      if (c === "(") depth++
      else if (c === ")") depth--
      else if ((c === "," || c === ";") && depth === 0) {
        const s = current.trim()
        if (s) result.push(s)
        current = ""
        continue
      }
      current += c
    }
    const s = current.trim()
    if (s) result.push(s)
  }
  return result
}

function err(code: string, message: string, details?: unknown): ParseResult {
  return { error: { code, message, details } }
}

function extractSection(
  text: string,
  startHeading: string,
  endHeadings: string[]
): string | null {
  const startIdx = text.indexOf(startHeading)
  if (startIdx === -1) return null
  const contentStart = startIdx + startHeading.length
  let endIdx = text.length
  for (const h of endHeadings) {
    const idx = text.indexOf(h, contentStart)
    if (idx !== -1 && idx < endIdx) endIdx = idx
  }
  return text.slice(contentStart, endIdx).trim()
}

function parseTechnicalSkills(content: string): StructuredCV["technicalSkills"] {
  const result: StructuredCV["technicalSkills"] = {
    frameworks: [],
    programming: [],
    database: [],
    os: [],
    cloud: [],
    tools: [],
    other: [],
  }
  let currentKey: keyof typeof result = "frameworks"
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const asSubsection = trimmed as (typeof TECH_SUBSECTIONS)[number]
    if (TECH_SUBSECTIONS.includes(asSubsection)) {
      currentKey = asSubsection.toLowerCase() as keyof typeof result
      continue
    }
    const items = splitByCommaOutsideParens(trimmed)
    result[currentKey].push(...items)
  }
  return result
}

function parseYearRangeBlocks(content: string): { period: string; contentLines: string[] }[] {
  const blocks: { period: string; contentLines: string[] }[] = []
  const lines = content.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(YEAR_RANGE_REGEX)
    if (!match) {
      i++
      continue
    }
    const period = line.trim()
    const contentLines: string[] = []
    i++
    while (i < lines.length) {
      const next = lines[i]
      if (next.match(YEAR_RANGE_REGEX)) break
      if (next.trim()) contentLines.push(next.trim())
      i++
    }
    blocks.push({ period, contentLines })
  }
  return blocks
}

/** True if line looks like a new role header: "Job Title - Organization" (short, has dash). */
function isRoleHeaderLine(line: string): boolean {
  if (line.length > ROLE_HEADER_MAX_LEN) return false
  const dashMatch = line.match(ROLE_HEADER_DASH)
  if (!dashMatch) return false
  return true
}

/** Title-only role: "Some Title" immediately followed by description verb (no " - Org"). */
function splitTitleFromDescription(segment: string): { title: string; description: string } | null {
  const match = segment.match(DESCRIPTION_START_PATTERN)
  if (!match || match.index == null || match.index === 0) return null
  const before = segment.slice(0, match.index).trim()
  if (before.length > 100) return null
  return { title: before, description: segment.slice(match.index) }
}

/** Extract organization from a segment that looks like "Title - Org" (for inheriting by next roles). */
function orgFromSegment(seg: string): string {
  const dashMatch = seg.match(ROLE_HEADER_DASH)
  if (!dashMatch) return ""
  const afterDash = seg.slice(seg.indexOf(dashMatch[0]) + dashMatch[0].length).trim()
  return splitOrganizationFromDescription(afterDash).organization
}

/** Split one year-block into multiple role sub-blocks (e.g. DELTA Fiber + 3 Unilever roles). */
function splitBlockIntoRoles(block: { period: string; contentLines: string[] }): { period: string; contentLines: string[] }[] {
  const { period, contentLines } = block
  if (contentLines.length === 0) return []
  const fullText = contentLines.join("\n\n")
  const normalized = fullText.replace(ORG_NEXT_TITLE_BOUNDARY, "Unilever\n\n")
  const segments = normalized.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) return []
  const result: { period: string; contentLines: string[] }[] = []
  let lastOrg = ""
  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i]!
    if (i === 0) {
      result.push({ period, contentLines: [seg] })
      lastOrg = orgFromSegment(seg)
      continue
    }
    if (DESCRIPTION_START_PATTERN.test(seg.slice(0, 50)) && result.length > 0) {
      const roleMatch = seg.match(NEXT_ROLE_TITLE_PATTERN)
      if (roleMatch && roleMatch.index != null && roleMatch.index > 0) {
        const descForPrevious = seg.slice(0, roleMatch.index).trim()
        const nextRoleSegment = seg.slice(roleMatch.index).trim()
        const last = result[result.length - 1]
        if (last && descForPrevious) last.contentLines.push(descForPrevious)
        seg = nextRoleSegment
      }
    }
    if (isRoleHeaderLine(seg)) {
      result.push({ period, contentLines: [seg] })
      lastOrg = orgFromSegment(seg)
      continue
    }
    const titleDesc = splitTitleFromDescription(seg)
    if (titleDesc) {
      const titleLine = lastOrg ? `${titleDesc.title} - ${lastOrg}` : titleDesc.title
      result.push({ period, contentLines: [titleLine, titleDesc.description] })
      continue
    }
    if (seg.match(ROLE_HEADER_DASH)) {
      const dashMatch = seg.match(ROLE_HEADER_DASH)
      if (dashMatch) {
        const idx = seg.indexOf(dashMatch[0])
        const titlePart = seg.slice(0, idx).trim()
        const afterDash = seg.slice(idx + dashMatch[0].length).trim()
        const { organization, rest } = splitOrganizationFromDescription(afterDash)
        const titleLine = rest ? `${titlePart} - ${organization}` : `${titlePart} - ${afterDash}`
        const lines = rest ? [titleLine, rest] : [titleLine]
        result.push({ period, contentLines: lines })
        lastOrg = organization || afterDash
        continue
      }
    }
    const last = result[result.length - 1]
    if (last) last.contentLines.push(seg)
    else result.push({ period, contentLines: [seg] })
    lastOrg = ""
  }
  return result
}

function isEducationBlock(firstLine: string): boolean {
  return EDUCATION_KEYWORDS.test(firstLine)
}

const DESCRIPTION_START_PATTERN =
  /(Ontwikkelde|Verantwoordelijk|Leidde|Fungeerde|Leverde|Rapporteert|Bewaakt|Faciliteert|Definieert|Documenteert|Plant|Mede-leiding|Fungeerde als|Leidde de|Identificeerde|Project\s+\d)\b/i

function splitOrganizationFromDescription(afterDash: string): { organization: string; rest: string } {
  const match = afterDash.match(DESCRIPTION_START_PATTERN)
  if (match && match.index != null && match.index > 0) {
    return {
      organization: afterDash.slice(0, match.index).trim(),
      rest: afterDash.slice(match.index),
    }
  }
  return { organization: afterDash, rest: "" }
}

function blockToProject(block: { period: string; contentLines: string[] }): StructuredCV["projects"][0] {
  const { period, contentLines } = block
  const firstLine = contentLines[0] ?? ""
  const restLines = contentLines.slice(1)
  let title = ""
  let organization = ""
  let descriptionFirstPart = ""
  const dashMatch = firstLine.match(ROLE_HEADER_DASH) // hyphen or en-dash, optional space before
  if (dashMatch) {
    const idx = firstLine.indexOf(dashMatch[0])
    title = firstLine.slice(0, idx).trim()
    const afterDash = firstLine.slice(idx + dashMatch[0].length).trim()
    const { organization: org, rest } = splitOrganizationFromDescription(afterDash)
    organization = org
    descriptionFirstPart = rest
  } else {
    title = firstLine
  }
  const description = [descriptionFirstPart, ...restLines].filter(Boolean).join("\n\n")
  return { period, title, organization, description }
}

function blockToEducationEntry(block: { period: string; contentLines: string[] }): string {
  return [block.period, ...block.contentLines].join("\n")
}

function parseListSection(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function parseCvFromBuffer(buffer: ArrayBuffer): Promise<ParseResult> {
  let rawText: string
  try {
    const nodeBuffer = Buffer.from(buffer)
    const result = await mammoth.extractRawText({ buffer: nodeBuffer })
    rawText = result.value
  } catch (e) {
    const details = e instanceof Error ? e.message : String(e)
    return err("MAMMOTH_EXTRACT", "Failed to extract text from DOCX", details)
  }

  const text = rawText

  const certHeading = CERT_HEADINGS.find((h) => text.includes(h))
  if (!certHeading) {
    return err(
      "MISSING_SECTION",
      "Missing required section: must contain 'Certificering' or 'Certifications'"
    )
  }

  const hasFrameworks = text.includes("Frameworks")
  if (!hasFrameworks) {
    return err("MISSING_SECTION", "Missing Technical skills section (expected 'Frameworks' subsection)")
  }

  const hasProfile = text.includes("Profile")
  const hasTechnicalSkills = text.includes("Technical skills")
  const hasOtherProjects = text.includes("Other projects")
  const hasEducation = text.includes("Education")

  const frameworksIdx = text.indexOf("Frameworks")
  const certIdx = text.indexOf(certHeading)

  const beforeFrameworks = text.slice(0, frameworksIdx).trim()
  const nameLines = beforeFrameworks.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  const name = nameLines[0] ?? ""
  const title = nameLines[1] ?? ""
  if (!name) {
    return err("PARSE_NAME", "Could not extract name (first non-empty line before Frameworks)")
  }
  if (!title) {
    return err("PARSE_TITLE", "Could not extract title (second non-empty line before Frameworks)")
  }

  let profileContent: string
  if (hasProfile) {
    const extracted = extractSection(text, "Profile", ["Technical skills", "Frameworks"])
    if (!extracted) return err("PARSE_PROFILE", "Could not extract Profile section")
    profileContent = extracted
  } else {
    const profileLines = beforeFrameworks
      .split(/\r?\n/)
      .slice(2)
      .map((s) => s.trim())
      .filter(Boolean)
    const withoutDuplicateTitle =
      profileLines[0] === title ? profileLines.slice(1) : profileLines
    profileContent = withoutDuplicateTitle.join("\n")
  }

  let techContent: string
  const firstYearRangeIdx = text.slice(frameworksIdx).search(YEAR_RANGE_REGEX)
  if (hasTechnicalSkills && hasOtherProjects) {
    const extracted = extractSection(text, "Technical skills", ["Other projects"])
    if (!extracted) return err("PARSE_TECHNICAL_SKILLS", "Could not extract Technical skills section")
    techContent = extracted
  } else if (firstYearRangeIdx >= 0) {
    techContent = text
      .slice(frameworksIdx + "Frameworks".length, frameworksIdx + firstYearRangeIdx)
      .trim()
  } else {
    techContent = text.slice(frameworksIdx + "Frameworks".length, certIdx).trim()
  }
  const technicalSkills = parseTechnicalSkills(techContent)

  let projects: StructuredCV["projects"] = []
  let education: string[] = []

  if (hasOtherProjects && hasEducation) {
    const projectsContent = extractSection(text, "Other projects", ["Education"])
    if (!projectsContent) return err("PARSE_PROJECTS", "Could not extract Other projects section")
    const blocks = parseYearRangeBlocks(projectsContent)
    projects = blocks.flatMap((block) => splitBlockIntoRoles(block).map(blockToProject))

    const educationContent = extractSection(text, "Education", [certHeading])
    if (educationContent === null) return err("PARSE_EDUCATION", "Could not extract Education section")
    education = parseListSection(educationContent)
  } else {
    const firstYearRangeIdx = text.slice(frameworksIdx).search(YEAR_RANGE_REGEX)
    const projectsAndEducationContent =
      firstYearRangeIdx >= 0
        ? text.slice(frameworksIdx + firstYearRangeIdx, certIdx).trim()
        : ""

    const blocks = parseYearRangeBlocks(projectsAndEducationContent)
    for (const block of blocks) {
      if (block.contentLines.length === 0) continue
      const firstLine = block.contentLines[0] ?? ""
      if (isEducationBlock(firstLine)) {
        education.push(blockToEducationEntry(block))
      } else {
        const roleBlocks = splitBlockIntoRoles(block)
        for (const rb of roleBlocks) projects.push(blockToProject(rb))
      }
    }
  }

  const certContent = text.slice(certIdx + certHeading.length).trim()
  const certifications = parseListSection(certContent)

  return {
    name,
    title,
    profile: profileContent,
    technicalSkills,
    projects,
    education,
    certifications,
  }
}
