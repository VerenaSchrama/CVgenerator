import type { StructuredCV } from "./types"

function parseStartYear(period: string): number {
  const m = period.match(/\b(19|20)\d{2}\b/)
  return m ? parseInt(m[0], 10) : 0
}

export function sortProjectsByYear(cv: StructuredCV): StructuredCV {
  const projects = [...cv.projects].sort((a, b) => {
    const yearA = parseStartYear(a.period)
    const yearB = parseStartYear(b.period)
    return yearB - yearA
  })
  return { ...cv, projects }
}
