"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { REVIEW_STORAGE_KEY } from "@/lib/constants"

type ParseSuccess = { cv: { name: string; title: string; profile: string; technicalSkills: object; projects: object[]; education: string[]; certifications: string[] } }
type ParseError = { error: { code: string; message: string; details?: unknown } }
type ParseResult = ParseSuccess | ParseError

export default function Home() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [roleDescription, setRoleDescription] = useState("")
  const [focus, setFocus] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReviewProposals() {
    if (!file || !roleDescription.trim()) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const parseRes = await fetch("/api/parse", { method: "POST", body: formData })
      const parseData: ParseResult = await parseRes.json()
      if ("error" in parseData) {
        setError(parseData.error.message)
        return
      }
      const cv = parseData.cv
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv,
          roleDescription: roleDescription.trim(),
          focus: focus.trim() || undefined,
        }),
      })
      const payload = await genRes.json()
      if (payload.error) {
        setError(payload.error.message ?? "Genereren mislukt")
        return
      }
      sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(payload))
      router.push("/review")
    } catch (e) {
      setError("Er is iets misgegaan. Probeer het opnieuw.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">CV aanpassen aan vacature</h1>
      <p className="mb-6 text-sm text-slate-600">
        Upload je CV en vul de rolbeschrijving in. Je krijgt daarna de wijzigingsvoorstellen te zien en kunt per onderdeel accepteren of afwijzen.
      </p>
      <div className="mb-6 space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">CV (DOCX) *</label>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-slate-800 hover:file:bg-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Rolbeschrijving *</label>
          <textarea
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="Plak de vacaturetekst of functie-eisen..."
            rows={4}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Focus (optioneel)</label>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="bijv. data analytics, Python"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleReviewProposals}
          disabled={!file || !roleDescription.trim() || loading}
          className="w-full rounded-md bg-slate-800 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Bezig met verwerken…" : "Bekijk wijzigingsvoorstellen"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <p className="font-medium">Fout</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}
    </main>
  )
}
