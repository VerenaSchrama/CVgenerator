import type { StructuredCV } from "./types"
import { score } from "./relevance"
import { runValidators, type ValidationWarning } from "./validators"

const SKILL_CATEGORIES = [
  "frameworks",
  "programming",
  "database",
  "os",
  "cloud",
  "tools",
  "other",
] as const

export type TailorMeta = {
  reorderedSkillCategories: string[]
  skillCategoryOrder: string[]
}

export type TailorResult = {
  tailored: StructuredCV
  meta: TailorMeta
  warnings: ValidationWarning[]
}

function parseStartYear(period: string): number {
  const m = period.match(/\b(19|20)\d{2}\b/)
  return m ? parseInt(m[0], 10) : 0
}

function skillCategoryScore(
  items: string[],
  roleText: string
): number {
  return score(items.join(" "), roleText)
}

export function tailorCv(
  originalCV: StructuredCV,
  roleDescription: string,
  focus?: string
): TailorResult {
  const roleText = roleDescription + " " + (focus ?? "")
  const warnings: ValidationWarning[] = []

  const tailoredProjects = [...originalCV.projects].sort((a, b) => {
    const yearA = parseStartYear(a.period)
    const yearB = parseStartYear(b.period)
    return yearB - yearA
  })

  const categoryScores = SKILL_CATEGORIES.map((cat) => ({
    category: cat,
    score: skillCategoryScore(originalCV.technicalSkills[cat], roleText),
  }))

  const originalOrder = [...SKILL_CATEGORIES]
  const sortedCategories = [...categoryScores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return originalOrder.indexOf(a.category) - originalOrder.indexOf(b.category)
  })

  const skillCategoryOrder = sortedCategories.map((c) => c.category)
  const reorderedSkillCategories: string[] = []
  for (let i = 0; i < skillCategoryOrder.length; i++) {
    if (skillCategoryOrder[i] !== originalOrder[i]) {
      reorderedSkillCategories.push(skillCategoryOrder[i])
    }
  }

  const tailoredSkills: StructuredCV["technicalSkills"] = {
    frameworks: [...originalCV.technicalSkills.frameworks],
    programming: [...originalCV.technicalSkills.programming],
    database: [...originalCV.technicalSkills.database],
    os: [...originalCV.technicalSkills.os],
    cloud: [...originalCV.technicalSkills.cloud],
    tools: [...originalCV.technicalSkills.tools],
    other: [...originalCV.technicalSkills.other],
  }

  const tailored: StructuredCV = {
    name: originalCV.name,
    title: originalCV.title,
    profile: originalCV.profile,
    technicalSkills: tailoredSkills,
    projects: tailoredProjects,
    education: [...originalCV.education],
    certifications: [...originalCV.certifications],
  }

  const { tailored: validated, warnings: valWarnings } = runValidators(
    originalCV,
    tailored
  )
  warnings.push(...valWarnings)

  const skillsReverted = valWarnings.some((w) => w.code === "SKILLS_SUBSET")

  return {
    tailored: validated,
    meta: {
      reorderedSkillCategories: skillsReverted ? [] : reorderedSkillCategories,
      skillCategoryOrder: skillsReverted ? [...originalOrder] : skillCategoryOrder,
    },
    warnings,
  }
}
