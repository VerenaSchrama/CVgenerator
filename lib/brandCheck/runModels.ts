import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

export interface ModelResult {
  text: string | null
  error: string | null
}

export interface PromptResults {
  gpt: ModelResult
  gemini: ModelResult
  claude: ModelResult
}

export interface ApiKeys {
  openai: string
  gemini: string
  anthropic: string
}

async function callGpt(prompt: string, apiKey: string): Promise<ModelResult> {
  try {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    })
    const text = completion.choices[0]?.message?.content?.trim() ?? null
    return { text, error: text ? null : "Lege reactie van GPT" }
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : String(e) }
  }
}

async function callGemini(
  prompt: string,
  apiKey: string
): Promise<ModelResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
    const result = await model.generateContent(prompt)
    const text = result.response.text()?.trim() ?? null
    return { text, error: text ? null : "Lege reactie van Gemini" }
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : String(e) }
  }
}

async function callClaude(
  prompt: string,
  apiKey: string
): Promise<ModelResult> {
  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })
    const text =
      message.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim() || null
    return { text, error: text ? null : "Lege reactie van Claude" }
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function runAllModels(
  prompt: string,
  keys: ApiKeys
): Promise<PromptResults> {
  const [gptResult, geminiResult, claudeResult] = await Promise.allSettled([
    callGpt(prompt, keys.openai),
    callGemini(prompt, keys.gemini),
    callClaude(prompt, keys.anthropic),
  ])

  function unwrap(r: PromiseSettledResult<ModelResult>): ModelResult {
    if (r.status === "fulfilled") return r.value
    return { text: null, error: r.reason?.message ?? "Onbekende fout" }
  }

  return {
    gpt: unwrap(gptResult),
    gemini: unwrap(geminiResult),
    claude: unwrap(claudeResult),
  }
}
