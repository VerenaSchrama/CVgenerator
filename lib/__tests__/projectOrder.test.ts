import { describe, it, expect } from "vitest"
import { sortProjectsByYear } from "../projectOrder"
import type { StructuredCV } from "../types"

const baseCv: StructuredCV = {
  name: "Test",
  title: "Dev",
  profile: "x",
  technicalSkills: {
    frameworks: [],
    programming: [],
    database: [],
    os: [],
    cloud: [],
    tools: [],
    other: [],
  },
  projects: [
    { period: "2016-2018", title: "A", organization: "X", description: "" },
    { period: "2020-2022", title: "B", organization: "Y", description: "" },
    { period: "2018-2020", title: "C", organization: "Z", description: "" },
  ],
  education: [],
  certifications: [],
}

describe("sortProjectsByYear", () => {
  it("sorts projects newest to oldest", () => {
    const result = sortProjectsByYear(baseCv)
    expect(result.projects[0].period).toBe("2020-2022")
    expect(result.projects[1].period).toBe("2018-2020")
    expect(result.projects[2].period).toBe("2016-2018")
  })

  it("does not mutate original", () => {
    const result = sortProjectsByYear(baseCv)
    expect(baseCv.projects[0].period).toBe("2016-2018")
    expect(result.projects[0].period).toBe("2020-2022")
  })
})
