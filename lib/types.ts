export type StructuredCV = {
  name: string
  title: string
  profile: string
  technicalSkills: {
    frameworks: string[]
    programming: string[]
    database: string[]
    os: string[]
    cloud: string[]
    tools: string[]
    other: string[]
  }
  projects: {
    period: string
    title: string
    organization: string
    description: string
  }[]
  education: string[]
  certifications: string[]
}

export type ParseError = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ParseResult = StructuredCV | ParseError
