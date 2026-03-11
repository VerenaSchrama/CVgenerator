export interface BrandMatch {
  count: number
  found: boolean
}

export function detectBrand(text: string, brand: string): BrandMatch {
  if (!brand.trim() || !text.trim()) return { count: 0, found: false }
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(escaped, "gi")
  const matches = text.match(regex)
  const count = matches?.length ?? 0
  return { count, found: count > 0 }
}
