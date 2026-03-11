const STOPWORDS = new Set([
  "the", "and", "of", "in", "to", "a", "for", "with", "on",
])

export function normalize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
  return new Set(tokens)
}

export function score(a: string, b: string): number {
  const tokensA = normalize(a)
  const tokensB = normalize(b)
  return Array.from(tokensA).filter((t) => tokensB.has(t)).length
}
