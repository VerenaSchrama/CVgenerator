import { diffWords } from "diff"

export type DiffToken =
  | { kind: "equal"; text: string }
  | { kind: "add"; text: string }
  | { kind: "remove"; text: string }

export function wordDiff(original: string, current: string): DiffToken[] {
  const changes = diffWords(original, current)
  const tokens: DiffToken[] = []
  for (const c of changes) {
    if (c.added) {
      tokens.push({ kind: "add", text: c.value })
    } else if (c.removed) {
      tokens.push({ kind: "remove", text: c.value })
    } else {
      tokens.push({ kind: "equal", text: c.value })
    }
  }
  return tokens
}

export function wordDiffForDisplay(original: string, current: string): {
  originalTokens: DiffToken[]
  currentTokens: DiffToken[]
} {
  const changes = diffWords(original, current)
  const originalTokens: DiffToken[] = []
  const currentTokens: DiffToken[] = []

  for (const c of changes) {
    if (c.added) {
      currentTokens.push({ kind: "add", text: c.value })
    } else if (c.removed) {
      originalTokens.push({ kind: "remove", text: c.value })
    } else {
      originalTokens.push({ kind: "equal", text: c.value })
      currentTokens.push({ kind: "equal", text: c.value })
    }
  }

  return { originalTokens, currentTokens }
}
