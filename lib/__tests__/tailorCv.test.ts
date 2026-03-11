import { describe, it, expect } from "vitest"
import { tailorCv } from "../tailorCv"
import type { StructuredCV } from "../types"

const baseCv: StructuredCV = {
  name: "Test User",
  title: "Developer",
  profile: "Profile text",
  technicalSkills: {
    frameworks: ["React"],
    programming: ["Python", "Java"],
    database: ["MySQL"],
    os: ["Linux"],
    cloud: ["AWS"],
    tools: ["Git"],
    other: ["Scrum"],
  },
  projects: [
    { period: "2020-2022", title: "Python Dev", organization: "Acme", description: "Python work" },
    { period: "2018-2020", title: "Java Dev", organization: "Corp", description: "Java work" },
    { period: "2016-2018", title: "Intern", organization: "Startup", description: "General" },
  ],
  education: ["MSc CS 2015"],
  certifications: ["AWS Certified"],
}

describe("tailorCv", () => {
  it("sorts projects by date newest to oldest", () => {
    const cvWithMixedOrder: StructuredCV = {
      ...baseCv,
      projects: [
        { period: "2016-2018", title: "Intern", organization: "X", description: "general" },
        { period: "2020-2022", title: "Python Dev", organization: "Acme", description: "Python work" },
        { period: "2018-2020", title: "Java", organization: "Y", description: "java" },
      ],
    }
    const { tailored } = tailorCv(cvWithMixedOrder, "anything")
    expect(tailored.projects[0].period).toBe("2020-2022")
    expect(tailored.projects[1].period).toBe("2018-2020")
    expect(tailored.projects[2].period).toBe("2016-2018")
  })

  it("meta has reorderedSkillCategories and skillCategoryOrder", () => {
    const { meta } = tailorCv(baseCv, "Python developer")
    expect(meta).toHaveProperty("reorderedSkillCategories")
    expect(meta).toHaveProperty("skillCategoryOrder")
  })

  it("education and certifications unchanged", () => {
    const { tailored } = tailorCv(baseCv, "anything")
    expect(tailored.education).toEqual(baseCv.education)
    expect(tailored.certifications).toEqual(baseCv.certifications)
  })
})
