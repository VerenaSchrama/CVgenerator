import { describe, it, expect } from "vitest"
import {
  validateYears,
  validateSkillsSubset,
  validateEducationCertLock,
  runValidators,
} from "../validators"
import type { StructuredCV } from "../types"

const baseCv: StructuredCV = {
  name: "Test",
  title: "Dev",
  profile: "Profile",
  technicalSkills: { frameworks: [], programming: ["Python"], database: [], os: [], cloud: [], tools: [], other: [] },
  projects: [{ period: "2020-2022", title: "A", organization: "B", description: "Work in 2021" }],
  education: ["MSc 2019"],
  certifications: ["Cert"],
}

describe("validateYears", () => {
  it("passes when tailored has no new years", () => {
    const tailored = { ...baseCv }
    expect(validateYears(baseCv, tailored)).toBeNull()
  })

  it("fails when tailored introduces new year", () => {
    const tailored = {
      ...baseCv,
      profile: "Worked in 2030",
    }
    const warn = validateYears(baseCv, tailored)
    expect(warn).not.toBeNull()
    expect(warn?.code).toBe("YEAR_GUARD")
  })
})

describe("validateSkillsSubset", () => {
  it("passes when tailored skills are subset", () => {
    const tailored = { ...baseCv, technicalSkills: { ...baseCv.technicalSkills, programming: ["Python"] } }
    expect(validateSkillsSubset(baseCv, tailored)).toBeNull()
  })

  it("fails when tailored has new skill", () => {
    const tailored = {
      ...baseCv,
      technicalSkills: { ...baseCv.technicalSkills, programming: ["Python", "Rust"] },
    }
    const warn = validateSkillsSubset(baseCv, tailored)
    expect(warn).not.toBeNull()
    expect(warn?.code).toBe("SKILLS_SUBSET")
  })
})

describe("validateEducationCertLock", () => {
  it("passes when education and certs match", () => {
    expect(validateEducationCertLock(baseCv, baseCv)).toBeNull()
  })

  it("fails when education differs", () => {
    const tailored = { ...baseCv, education: ["Different"] }
    const warn = validateEducationCertLock(baseCv, tailored)
    expect(warn).not.toBeNull()
    expect(warn?.code).toBe("EDUCATION_LOCK")
  })

  it("fails when certifications differ", () => {
    const tailored = { ...baseCv, certifications: ["Different"] }
    const warn = validateEducationCertLock(baseCv, tailored)
    expect(warn).not.toBeNull()
    expect(warn?.code).toBe("CERTIFICATIONS_LOCK")
  })
})

describe("runValidators", () => {
  it("reverts projects when year guard fails", () => {
    const tailored = { ...baseCv, profile: "2030 work" }
    const { tailored: result, warnings } = runValidators(baseCv, tailored)
    expect(warnings.some((w) => w.code === "YEAR_GUARD")).toBe(true)
    expect(result.projects).toEqual(baseCv.projects)
  })
})
