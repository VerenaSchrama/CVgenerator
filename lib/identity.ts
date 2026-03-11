export function projectId(project: {
  period: string
  title: string
  organization: string
}): string {
  const key = `${project.period}|${project.title}|${project.organization}`
  return simpleHash(key)
}

function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h = (h << 5) - h + c
    h = h & h
  }
  return Math.abs(h).toString(36)
}
