import type { StructuredCV } from "./types"

const YEAR_REGEX = /\b(19|20)\d{2}\b/g

export type ValidationWarning = {
  code: string
  message: string
  details?: unknown
}

function extractYears(text: string): string[] {
  const years: string[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(YEAR_REGEX.source, "g")
  while ((m = re.exec(text)) !== null) {
    years.push(m[0])
  }
  return years
}

function flattenSkills(cv: StructuredCV): Set<string> {
  const set = new Set<string>()
  for (const arr of Object.values(cv.technicalSkills)) {
    for (const s of arr) {
      set.add(s.toLowerCase().trim())
    }
  }
  return set
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

export function validateYears(
  original: StructuredCV,
  tailored: StructuredCV
): ValidationWarning | null {
  const origYears = new Set(extractYears(JSON.stringify(original)))
  const tailoredYears = extractYears(JSON.stringify(tailored))
  for (const y of tailoredYears) {
    if (!origYears.has(y)) {
      return {
        code: "YEAR_GUARD",
        message: `Tailored CV introduces year not in original: ${y}`,
        details: { year: y },
      }
    }
  }
  return null
}

export function validateSkillsSubset(
  original: StructuredCV,
  tailored: StructuredCV
): ValidationWarning | null {
  const origSkills = flattenSkills(original)
  const tailoredSkills = flattenSkills(tailored)
  for (const s of tailoredSkills) {
    if (!origSkills.has(s)) {
      return {
        code: "SKILLS_SUBSET",
        message: `Tailored CV has skill not in original: ${s}`,
        details: { skill: s },
      }
    }
  }
  return null
}

export function validateEducationCertLock(
  original: StructuredCV,
  tailored: StructuredCV
): ValidationWarning | null {
  if (!arraysEqual(original.education, tailored.education)) {
    return {
      code: "EDUCATION_LOCK",
      message: "Education must match original exactly",
    }
  }
  if (!arraysEqual(original.certifications, tailored.certifications)) {
    return {
      code: "CERTIFICATIONS_LOCK",
      message: "Certifications must match original exactly",
    }
  }
  return null
}

export function runValidators(
  original: StructuredCV,
  tailored: StructuredCV
): { tailored: StructuredCV; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = []
  let result = { ...tailored }

  const yearWarn = validateYears(original, result)
  if (yearWarn) {
    warnings.push(yearWarn)
    result = { ...original }
  }

  const skillsWarn = validateSkillsSubset(original, result)
  if (skillsWarn) {
    warnings.push(skillsWarn)
    result = {
      ...result,
      technicalSkills: { ...original.technicalSkills },
    }
  }

  const eduCertWarn = validateEducationCertLock(original, result)
  if (eduCertWarn) {
    warnings.push(eduCertWarn)
    result = {
      ...result,
      education: [...original.education],
      certifications: [...original.certifications],
    }
  }

  return { tailored: result, warnings }
}
