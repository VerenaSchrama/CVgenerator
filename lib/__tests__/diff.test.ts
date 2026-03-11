import { describe, it, expect } from "vitest"
import { wordDiff, wordDiffForDisplay } from "../diff"

describe("wordDiff", () => {
  it("returns equal for identical text", () => {
    const tokens = wordDiff("hello world", "hello world")
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toEqual({ kind: "equal", text: "hello world" })
  })

  it("detects added words", () => {
    const tokens = wordDiff("hello", "hello world")
    expect(tokens.some((t) => t.kind === "add" && t.text.includes("world"))).toBe(true)
  })

  it("detects removed words", () => {
    const tokens = wordDiff("hello world", "hello")
    expect(tokens.some((t) => t.kind === "remove" && t.text.includes("world"))).toBe(true)
  })
})

describe("wordDiffForDisplay", () => {
  it("produces aligned original and current tokens", () => {
    const { originalTokens, currentTokens } = wordDiffForDisplay("old text", "new text")
    expect(originalTokens.length).toBeGreaterThan(0)
    expect(currentTokens.length).toBeGreaterThan(0)
  })
})
