import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `Je bent een CV-expert. Je herschrijft alleen de profieltekst van een CV zodat die beter aansluit bij de gegeven vacature/rol.
Regels:
- Behoud alle feiten en ervaring; voeg niets toe wat niet in de originele tekst staat.
- Houd dezelfde taal als de bron (Nederlands of Engels).
- Maak de tekst bondig en gericht op de rol; leg nadruk op relevante competenties en ervaring.
- Geef alleen de herschreven profieltekst terug, zonder aanhalingstekens of extra uitleg.`

export type RewriteProfileResult =
  | { ok: true; profile: string }
  | { ok: false; error: string }

/**
 * Rewrites the CV profile text to better match the role description.
 * Uses Claude (ANTHROPIC_API_KEY) if set, otherwise OpenAI (OPENAI_API_KEY).
 */
export async function rewriteProfile(
  profile: string,
  roleDescription: string,
  focus?: string
): Promise<RewriteProfileResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (anthropicKey?.trim()) {
    return rewriteWithClaude(profile, roleDescription, focus, anthropicKey)
  }
  if (openaiKey?.trim()) {
    return rewriteWithOpenAI(profile, roleDescription, focus, openaiKey)
  }
  return { ok: false, error: "ANTHROPIC_API_KEY of OPENAI_API_KEY niet gezet" }
}

async function rewriteWithClaude(
  profile: string,
  roleDescription: string,
  focus: string | undefined,
  apiKey: string
): Promise<RewriteProfileResult> {
  const roleText = focus?.trim()
    ? `${roleDescription.trim()}\n\nFocus: ${focus.trim()}`
    : roleDescription.trim()
  const userContent = `Rol/vacature:\n${roleText}\n\nHuidige profieltekst:\n${profile}`

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    })

    const textParts: string[] = []
    for (const block of message.content) {
      if (block.type === "text") textParts.push(block.text)
    }
    const content = textParts.join("").trim()
    if (!content) {
      return { ok: false, error: "Lege reactie van Claude" }
    }
    return { ok: true, profile: content }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}

async function rewriteWithOpenAI(
  profile: string,
  roleDescription: string,
  focus: string | undefined,
  apiKey: string
): Promise<RewriteProfileResult> {
  const roleText = focus?.trim()
    ? `${roleDescription.trim()}\n\nFocus: ${focus.trim()}`
    : roleDescription.trim()
  const userContent = `Rol/vacature:\n${roleText}\n\nHuidige profieltekst:\n${profile}`

  try {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 500,
      temperature: 0.4,
    })

    const content = completion.choices[0]?.message?.content?.trim()
    if (!content) {
      return { ok: false, error: "Lege reactie van OpenAI" }
    }
    return { ok: true, profile: content }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}
