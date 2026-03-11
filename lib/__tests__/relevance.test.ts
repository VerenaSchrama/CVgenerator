import { describe, it, expect } from "vitest"
import { normalize, score } from "../relevance"

describe("normalize", () => {
  it("lowercases and removes stopwords", () => {
    const result = normalize("The Quick Brown Fox and the Lazy Dog")
    expect(result).toEqual(new Set(["quick", "brown", "fox", "lazy", "dog"]))
  })

  it("replaces punctuation with spaces", () => {
    const result = normalize("hello-world, test!")
    expect(result).toContain("hello")
    expect(result).toContain("world")
    expect(result).toContain("test")
  })

  it("returns unique tokens", () => {
    const result = normalize("foo foo bar bar")
    expect(result.size).toBe(2)
    expect(result).toContain("foo")
    expect(result).toContain("bar")
  })
})

describe("score", () => {
  it("returns intersection size", () => {
    expect(score("python data analytics", "python analytics role")).toBe(2)
  })

  it("returns 0 when no overlap", () => {
    expect(score("java csharp", "python ruby")).toBe(0)
  })

  it("is case insensitive", () => {
    expect(score("Python", "python")).toBe(1)
  })
})
