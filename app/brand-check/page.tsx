"use client"

import { useState } from "react"

export default function BrandCheckPage() {
  const [file, setFile] = useState<File | null>(null)
  const [brand, setBrand] = useState("")
  const [hasHeader, setHasHeader] = useState(true)
  const [openaiKey, setOpenaiKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [showKeys, setShowKeys] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleRun() {
    if (!file || !brand.trim()) return
    setLoading(true)
    setError(null)
    setDone(false)

    try {
      const form = new FormData()
      form.append("file", file)
      form.append("brand", brand.trim())
      form.append("hasHeader", String(hasHeader))
      if (openaiKey.trim()) form.append("openaiKey", openaiKey.trim())
      if (geminiKey.trim()) form.append("geminiKey", geminiKey.trim())
      if (anthropicKey.trim()) form.append("anthropicKey", anthropicKey.trim())

      const res = await fetch("/api/brand-check", { method: "POST", body: form })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Onbekende fout" }))
        setError(body.error ?? "Verzoek mislukt")
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "brand-check-resultaten.xlsx"
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (e) {
      setError("Er is iets misgegaan. Controleer de console voor details.")
    } finally {
      setLoading(false)
    }
  }

  const canRun = !!file && !!brand.trim() && !loading

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-semibold text-slate-800">
        Brand Check
      </h1>
      <p className="mb-8 text-sm text-slate-600">
        Upload een Excel-bestand met prompts in kolom A. De tool runt elke
        prompt in GPT-4o, Gemini en Claude en exporteert de antwoorden met
        highlighting wanneer het merk wordt genoemd.
      </p>

      <div className="space-y-6">
        {/* File upload */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Excel-bestand met prompts (.xlsx) *
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              setError(null)
              setDone(false)
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-slate-800 hover:file:bg-slate-300"
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={hasHeader}
              onChange={(e) => setHasHeader(e.target.checked)}
              className="rounded"
            />
            Eerste rij is koptekst (overslaan)
          </label>
        </div>

        {/* Brand name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Merknaam *
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="bijv. Xomnia"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Detectie is niet hoofdlettergevoelig.
          </p>
        </div>

        {/* API keys (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowKeys((v) => !v)}
            className="text-sm font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900"
          >
            {showKeys ? "▾" : "▸"} API keys instellen{" "}
            <span className="font-normal text-slate-400">
              (optioneel als .env is ingesteld)
            </span>
          </button>

          {showKeys && (
            <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Keys die je hier invult worden alleen gebruikt voor deze sessie
                en niet opgeslagen.
              </p>
              {[
                {
                  label: "OpenAI API key",
                  value: openaiKey,
                  set: setOpenaiKey,
                  placeholder: "sk-...",
                },
                {
                  label: "Google Gemini API key",
                  value: geminiKey,
                  set: setGeminiKey,
                  placeholder: "AIza...",
                },
                {
                  label: "Anthropic API key",
                  value: anthropicKey,
                  set: setAnthropicKey,
                  placeholder: "sk-ant-...",
                },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {label}
                  </label>
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!canRun}
          className="rounded-md bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Bezig met verwerken…" : "Run & download resultaten"}
        </button>

        {loading && (
          <p className="text-sm text-slate-500">
            Prompts worden verstuurd naar GPT-4o, Gemini en Claude. Dit kan
            even duren afhankelijk van het aantal prompts…
          </p>
        )}

        {done && !error && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Klaar. Het Excel-bestand is gedownload.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <p className="font-medium">Fout</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Legenda output Excel
        </h2>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-8 rounded bg-yellow-200" />
            <span>Merk gevonden in antwoord</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-8 rounded bg-red-200" />
            <span>API-fout bij dit model</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-8 rounded bg-white border border-slate-200" />
            <span>Geen vermelding</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Tab &quot;Samenvatting&quot;: totaal vermeldingen + % prompts met
          vermelding per model.
        </p>
      </div>
    </main>
  )
}
