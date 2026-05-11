// ── Gemini AI Configuration ───────────────────────────────────────────────────
// Primary model: set VITE_GEMINI_MODEL in .env to override
export const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

// Fallback chain: each model has its own separate daily quota bucket
// gemini-1.5-flash / gemini-1.5-flash-latest are no longer available (404)
const _chain = [
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]
// Deduplicate in case env var matches a default
export const GEMINI_FALLBACK_MODELS = [...new Set(_chain)]
