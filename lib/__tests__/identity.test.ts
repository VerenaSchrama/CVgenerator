import { describe, it, expect } from "vitest"
import { projectId } from "../identity"

describe("projectId", () => {
  it("returns deterministic hash for same input", () => {
    const p = { period: "2020-2022", title: "Dev", organization: "Acme" }
    expect(projectId(p)).toBe(projectId(p))
  })

  it("returns different hash for different projects", () => {
    const p1 = { period: "2020-2022", title: "Dev", organization: "Acme" }
    const p2 = { period: "2020-2022", title: "Dev", organization: "Corp" }
    expect(projectId(p1)).not.toBe(projectId(p2))
  })
})
