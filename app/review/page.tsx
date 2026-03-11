"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { REVIEW_STORAGE_KEY } from "@/lib/constants"
import { sortProjectsByYear } from "@/lib/projectOrder"
import { projectId } from "@/lib/identity"
import { wordDiffForDisplay } from "@/lib/diff"
import type { StructuredCV } from "@/lib/types"

type GeneratePayload = {
  original: StructuredCV
  tailored: StructuredCV
  meta: {
    reorderedSkillCategories: string[]
    skillCategoryOrder: string[]
  }
  warnings: { code: string; message: string; details?: unknown }[]
}

type ReviewState = {
  original: StructuredCV
  suggested: StructuredCV
  current: StructuredCV
  meta: GeneratePayload["meta"]
  warnings: GeneratePayload["warnings"]
}

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  frameworks: "Frameworks",
  programming: "Programming",
  database: "Database",
  os: "OS",
  cloud: "Cloud",
  tools: "Tools",
  other: "Other",
}

/** Vaste volgorde van vaardighedencategorieën in het originele CV (zonder tailoring). */
const ORIGINAL_SKILL_ORDER = [
  "frameworks",
  "programming",
  "database",
  "os",
  "cloud",
  "tools",
  "other",
] as const

function skillsToText(skills: StructuredCV["technicalSkills"], categoryOrder: string[]): string {
  return categoryOrder
    .map((cat) => (skills[cat as keyof typeof skills] ?? []).join(", "))
    .filter(Boolean)
    .join(" ")
}

function getProjectByIndex(cv: StructuredCV, idx: number) {
  const sorted = sortProjectsByYear(cv)
  return sorted.projects[idx] ?? null
}

export default function ReviewPage() {
  const [state, setState] = useState<ReviewState | null>(null)
  const [downloadToast, setDownloadToast] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message)
    setTimeout(() => setFeedbackMessage(null), 2500)
  }, [])

  const loadState = useCallback(() => {
    const raw = sessionStorage.getItem(REVIEW_STORAGE_KEY)
    if (raw) {
      try {
        const p = JSON.parse(raw) as GeneratePayload & { current?: StructuredCV }
        const original = sortProjectsByYear(p.original)
        const suggested = sortProjectsByYear(p.tailored)
        const current = p.current
          ? sortProjectsByYear(p.current)
          : sortProjectsByYear({ ...suggested })
        setState({
          original,
          suggested,
          current,
          meta: p.meta,
          warnings: p.warnings,
        })
      } catch {
        setState(null)
      }
    }
  }, [])

  useEffect(() => {
    loadState()
  }, [loadState])

  const persist = useCallback((s: ReviewState) => {
    setState(s)
    sessionStorage.setItem(
      REVIEW_STORAGE_KEY,
      JSON.stringify({
        original: s.original,
        tailored: s.suggested,
        current: s.current,
        meta: s.meta,
        warnings: s.warnings,
      })
    )
  }, [])

  const acceptProfile = () => {
    if (!state) return
    persist({
      ...state,
      current: { ...state.current, profile: state.suggested.profile },
    })
    showFeedback("Profiel: accepteren vastgelegd")
  }

  const rejectProfile = () => {
    if (!state) return
    persist({
      ...state,
      current: { ...state.current, profile: state.original.profile },
    })
    showFeedback("Profiel: afwijzen vastgelegd")
  }

  const resetProfile = () => {
    if (!state) return
    persist({
      ...state,
      current: { ...state.current, profile: state.suggested.profile },
    })
    showFeedback("Profiel: gereset naar voorstel")
  }

  const acceptProjectDesc = (idx: number) => {
    if (!state) return
    const proj = getProjectByIndex(state.suggested, idx)
    if (!proj) return
    const projects = [...state.current.projects]
    const sorted = sortProjectsByYear(state.current)
    if (idx < projects.length) {
      projects[idx] = { ...projects[idx], description: proj.description }
      persist({ ...state, current: { ...state.current, projects } })
      showFeedback(`Project ${idx + 1}: accepteren vastgelegd`)
    }
  }

  const rejectProjectDesc = (idx: number) => {
    if (!state) return
    const proj = getProjectByIndex(state.original, idx)
    if (!proj) return
    const projects = [...state.current.projects]
    if (idx < projects.length) {
      projects[idx] = { ...projects[idx], description: proj.description }
      persist({ ...state, current: { ...state.current, projects } })
      showFeedback(`Project ${idx + 1}: afwijzen vastgelegd`)
    }
  }

  const resetProjects = () => {
    if (!state) return
    const projects = state.current.projects.map((p, i) => {
      const sp = getProjectByIndex(state.suggested, i)
      return sp ? { ...p, description: sp.description } : p
    })
    persist({ ...state, current: { ...state.current, projects } })
    showFeedback("Projecten: gereset naar voorstel")
  }

  const acceptSkillsOrder = () => {
    if (!state) return
    persist({
      ...state,
      meta: { ...state.meta, skillCategoryOrder: [...state.meta.skillCategoryOrder] },
    })
    showFeedback("Vaardigheden volgorde: accepteren vastgelegd")
  }

  const rejectSkillsOrder = () => {
    if (!state) return
    const originalOrder = [
      "frameworks",
      "programming",
      "database",
      "os",
      "cloud",
      "tools",
      "other",
    ]
    persist({
      ...state,
      meta: {
        ...state.meta,
        skillCategoryOrder: originalOrder,
        reorderedSkillCategories: [],
      },
    })
    showFeedback("Vaardigheden volgorde: afwijzen vastgelegd")
  }

  const acceptSkillsText = () => {
    if (!state) return
    persist({
      ...state,
      current: { ...state.current, technicalSkills: { ...state.suggested.technicalSkills } },
    })
    showFeedback("Vaardigheden tekst: accepteren vastgelegd")
  }

  const rejectSkillsText = () => {
    if (!state) return
    persist({
      ...state,
      current: { ...state.current, technicalSkills: { ...state.original.technicalSkills } },
    })
    showFeedback("Vaardigheden tekst: afwijzen vastgelegd")
  }

  const resetSkills = () => {
    if (!state) return
    persist({
      ...state,
      current: { ...state.current, technicalSkills: { ...state.suggested.technicalSkills } },
      meta: { ...state.meta, skillCategoryOrder: [...state.meta.skillCategoryOrder] },
    })
    showFeedback("Vaardigheden: gereset naar voorstel")
  }

  const setProfile = (v: string) => {
    if (!state) return
    persist({ ...state, current: { ...state.current, profile: v } })
  }

  const setProjectDesc = (idx: number, v: string) => {
    if (!state) return
    const projects = [...state.current.projects]
    if (idx < projects.length) {
      projects[idx] = { ...projects[idx], description: v }
      persist({ ...state, current: { ...state.current, projects } })
    }
  }

  const setSkills = (cat: string, items: string[]) => {
    if (!state) return
    persist({
      ...state,
      current: {
        ...state.current,
        technicalSkills: { ...state.current.technicalSkills, [cat]: items },
      },
    })
  }

  const handleDownload = async () => {
    if (!state) return
    setDownloadLoading(true)
    setDownloadError(null)
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv: state.current }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? `Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const filename = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1] ?? "cv_tailored.docx"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloadToast(true)
      setTimeout(() => setDownloadToast(false), 3000)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "Download mislukt")
    } finally {
      setDownloadLoading(false)
    }
  }

  if (!state) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-slate-600">Geen beoordelingsdata. Upload een CV en klik op &apos;Bekijk wijzigingsvoorstellen&apos;.</p>
        <Link href="/" className="mt-4 inline-block text-slate-800 underline">
          ← Terug naar upload
        </Link>
      </main>
    )
  }

  const { original, suggested, current, meta } = state
  const categoryOrder = meta.skillCategoryOrder ?? Object.keys(current.technicalSkills)
  const currentSorted = sortProjectsByYear(current)

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Origineel vs Aangepast</h1>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            ← Nieuwe CV
          </Link>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadLoading}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloadLoading ? "Bezig…" : "DOCX downloaden"}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800 text-sm">
        Alle wijzigingen zijn voorstellen. Gebruik Accepteren / Afwijzen om een voorstel vast te leggen; je keuze wordt direct opgeslagen.
      </div>

      {downloadToast && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-800 text-sm">
          ✓ DOCX gedownload.
        </div>
      )}
      {downloadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-800 text-sm">
          {downloadError}
        </div>
      )}

      {feedbackMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-800 text-sm">
          ✓ {feedbackMessage}
        </div>
      )}

      {state.warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-medium">Warnings</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {state.warnings.map((w, i) => (
              <li key={i}>
                {w.code}: {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-medium text-slate-700">Origineel</h2>
          <CvSections
            cv={original}
            meta={meta}
            isOriginal
            current={current}
            categoryOrder={[...ORIGINAL_SKILL_ORDER]}
          />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-medium text-slate-700">Aangepast</h2>
          <CvSections
            cv={currentSorted}
            meta={meta}
            isOriginal={false}
            current={currentSorted}
            categoryOrder={categoryOrder}
            onProfileChange={setProfile}
            onProjectDescChange={setProjectDesc}
            onSkillsChange={setSkills}
            onAccepterenProfile={acceptProfile}
            onAfwijzenProfile={rejectProfile}
            onResetProfile={resetProfile}
            onAccepterenProjectDesc={acceptProjectDesc}
            onAfwijzenProjectDesc={rejectProjectDesc}
            onResetProjects={resetProjects}
            onAccepterenSkillsOrder={acceptSkillsOrder}
            onAfwijzenSkillsOrder={rejectSkillsOrder}
            onAccepterenSkillsText={acceptSkillsText}
            onAfwijzenSkillsText={rejectSkillsText}
            onResetSkills={resetSkills}
            original={original}
            suggested={suggested}
          />
        </div>
      </div>
    </main>
  )
}

function CvSections({
  cv,
  meta,
  isOriginal,
  current,
  categoryOrder,
  onProfileChange,
  onProjectDescChange,
  onSkillsChange,
  onAccepterenProfile,
  onAfwijzenProfile,
  onResetProfile,
  onAccepterenProjectDesc,
  onAfwijzenProjectDesc,
  onResetProjects,
  onAccepterenSkillsOrder,
  onAfwijzenSkillsOrder,
  onAccepterenSkillsText,
  onAfwijzenSkillsText,
  onResetSkills,
  original,
  suggested,
}: {
  cv: StructuredCV
  meta: GeneratePayload["meta"]
  isOriginal: boolean
  current: StructuredCV
  categoryOrder: string[]
  onProfileChange?: (v: string) => void
  onProjectDescChange?: (i: number, v: string) => void
  onSkillsChange?: (cat: string, items: string[]) => void
  onAccepterenProfile?: () => void
  onAfwijzenProfile?: () => void
  onResetProfile?: () => void
  onAccepterenProjectDesc?: (i: number) => void
  onAfwijzenProjectDesc?: (i: number) => void
  onResetProjects?: () => void
  onAccepterenSkillsOrder?: () => void
  onAfwijzenSkillsOrder?: () => void
  onAccepterenSkillsText?: () => void
  onAfwijzenSkillsText?: () => void
  onResetSkills?: () => void
  original?: StructuredCV
  suggested?: StructuredCV
}) {
  const origSorted = original ? sortProjectsByYear(original) : null
  const suggSorted = suggested ? sortProjectsByYear(suggested) : null

  return (
    <div className="space-y-6">
      <Section
        title="Profiel"
        isOriginal={isOriginal}
        onAccepteren={onAccepterenProfile}
        onAfwijzen={onAfwijzenProfile}
        onReset={onResetProfile}
      >
        {isOriginal ? (
          <p className="whitespace-pre-wrap text-sm text-slate-600">{cv.profile}</p>
        ) : (
          <>
            {original && (
              <DiffView
                original={original.profile}
                current={cv.profile}
                showOriginal={false}
              />
            )}
            <textarea
              value={cv.profile}
              onChange={(e) => onProfileChange?.(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </>
        )}
      </Section>

      <Section
        title="Vaardigheden"
        isOriginal={isOriginal}
        onAccepteren={onAccepterenSkillsText}
        onAfwijzen={onAfwijzenSkillsText}
        onReset={onResetSkills}
        onAccepterenOrder={onAccepterenSkillsOrder}
        onAfwijzenOrder={onAfwijzenSkillsOrder}
        hasOrderChange={meta.reorderedSkillCategories && meta.reorderedSkillCategories.length > 0}
      >
        {categoryOrder.map((cat) => {
          const items = cv.technicalSkills[cat as keyof typeof cv.technicalSkills] ?? []
          const reordered = meta.reorderedSkillCategories?.includes(cat)
          const origItems = original?.technicalSkills[cat as keyof typeof cv.technicalSkills] ?? []
          const origText = origItems.join(", ")
          const currText = items.join(", ")
          return (
            <div key={cat} className="mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">
                  {SKILL_CATEGORY_LABELS[cat] ?? cat}
                </span>
                {reordered && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                    Reordered
                  </span>
                )}
              </div>
              {isOriginal ? (
                <p className="text-sm text-slate-600">{items.join(", ")}</p>
              ) : (
                <>
                  {origText !== currText && (
                    <DiffView original={origText} current={currText} showOriginal={false} />
                  )}
                  <textarea
                    value={items.join(", ")}
                    onChange={(e) =>
                      onSkillsChange?.(
                        cat,
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    rows={2}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </>
              )}
            </div>
          )
        })}
      </Section>

      <Section
        title="Projecten"
        isOriginal={isOriginal}
        onReset={onResetProjects}
      >
        <div className="space-y-3">
          {cv.projects.map((p, i) => {
            const origProj = origSorted?.projects[i]
            const suggProj = suggSorted?.projects[i]
            return (
              <div key={projectId(p)} className="rounded border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{p.period}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {p.title}
                  {p.organization && ` — ${p.organization}`}
                </p>
                {isOriginal ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{p.description}</p>
                ) : (
                  <>
                    {origProj && origProj.description !== p.description && (
                      <DiffView
                        original={origProj.description}
                        current={p.description}
                        showOriginal={false}
                      />
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onAccepterenProjectDesc?.(i)}
                        className="rounded border border-green-600 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        Accepteren
                      </button>
                      <button
                        type="button"
                        onClick={() => onAfwijzenProjectDesc?.(i)}
                        className="rounded border border-red-600 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Afwijzen
                      </button>
                    </div>
                    <textarea
                      value={p.description}
                      onChange={(e) => onProjectDescChange?.(i, e.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Opleiding" locked>
        <ul className="list-inside list-disc text-sm text-slate-600">
          {cv.education.map((e, i) => (
            <li key={i} className="whitespace-pre-wrap">{e}</li>
          ))}
        </ul>
      </Section>

      <Section title="Certificeringen" locked>
        <ul className="list-inside list-disc text-sm text-slate-600">
          {cv.certifications.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function DiffView({
  original,
  current,
  showOriginal,
}: {
  original: string
  current: string
  showOriginal?: boolean
}) {
  if (original === current) return null
  const { originalTokens, currentTokens } = wordDiffForDisplay(original, current)
  const tokens = showOriginal ? originalTokens : currentTokens
  return (
    <div className="mb-2 rounded bg-slate-50 p-2 text-sm">
      {tokens.map((t, i) => (
        <span
          key={i}
          className={
            t.kind === "add"
              ? "bg-green-200"
              : t.kind === "remove"
                ? "bg-slate-200 line-through text-slate-500"
                : ""
          }
        >
          {t.text}
        </span>
      ))}
    </div>
  )
}

function Section({
  title,
  children,
  isOriginal,
  onAccepteren,
  onAfwijzen,
  onReset,
  onAccepterenOrder,
  onAfwijzenOrder,
  hasOrderChange,
  locked,
}: {
  title: string
  children: React.ReactNode
  isOriginal?: boolean
  onAccepteren?: () => void
  onAfwijzen?: () => void
  onReset?: () => void
  onAccepterenOrder?: () => void
  onAfwijzenOrder?: () => void
  hasOrderChange?: boolean
  locked?: boolean
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {locked && (
          <span title="Vast (niet aanpasbaar)" className="text-slate-400">
            🔒
          </span>
        )}
        {!isOriginal && !locked && (
          <div className="flex flex-wrap items-center gap-2">
            {onAccepteren && (
              <button
                type="button"
                onClick={onAccepteren}
                className="rounded border border-green-600 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
              >
                Accepteren
              </button>
            )}
            {onAfwijzen && (
              <button
                type="button"
                onClick={onAfwijzen}
                className="rounded border border-red-600 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Afwijzen
              </button>
            )}
            {hasOrderChange && onAccepterenOrder && onAfwijzenOrder && (
              <>
                <button
                  type="button"
                  onClick={onAccepterenOrder}
                  className="rounded border border-blue-600 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  Volgorde accepteren
                </button>
                <button
                  type="button"
                  onClick={onAfwijzenOrder}
                  className="rounded border border-orange-600 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                >
                  Volgorde afwijzen
                </button>
              </>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="rounded border border-slate-400 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
