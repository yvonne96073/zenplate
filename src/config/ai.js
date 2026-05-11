// ── Gemini AI Configuration ───────────────────────────────────────────────────
// Primary model: set VITE_GEMINI_MODEL in .env to override
export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'

// Fallback chain: primary → stable → legacy
// Note: gemini-1.5-flash-latest is deprecated (404) — use gemini-1.5-flash instead
const _chain = [
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
]
// Deduplicate in case env var matches a default
export const GEMINI_FALLBACK_MODELS = [...new Set(_chain)]
