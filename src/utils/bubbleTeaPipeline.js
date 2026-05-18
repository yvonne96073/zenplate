/**
 * Taiwan Hand-Shaken Drink Pipeline
 *
 * Detection priority:
 * 1. OCR: brand text from cup sticker / film / logo (via AI clues)
 * 2. Drink name / category from AI name + components
 * 3. Cup size from container_clue + keywords
 * 4. Toppings from name / components / clues
 * 5. Sugar: NEVER guessed from image — always ask user
 * 6. Fallback: category-level estimate with guided UX
 *
 * Sugar / ice levels are not estimated; they are always shown for user input.
 */

import {
  BOBA_BRANDS, BOBA_TOPPINGS, BOBA_QUICK_CHIPS,
  DRINK_CATEGORIES, DRINK_SIZES, SUGAR_LEVELS, ICE_LEVELS,
  matchBrandKey, matchDrinkKey, detectCategory, calcDrinkTotal,
} from './bubbleTeaDb'

// ── Hand-shaken drink detection ────────────────────────────────────────────────
// Keywords that strongly indicate a hand-shaken drink (not a general meal)
const DRINK_KEYWORDS = [
  // Pearl / topping items
  '珍珠', '波霸', '小珍珠', '仙草', '椰果', '布丁',
  // Drink types
  '奶茶', '鮮奶茶', '紅茶', '綠茶', '烏龍', '水果茶', '冬瓜', '多多',
  '黑糖', '芋頭', '奶蓋', '燒仙草', '熟成', '手搖', '飲料',
  // English
  'milk tea', 'boba', 'bubble tea', 'pearl', 'hand-shaken', 'hand shaken',
  // Containers
  '手搖杯', '飲料杯', '封膜', '杯貼',
]

// All brand OCR tokens (flattened)
const ALL_BRAND_TOKENS = Object.values(BOBA_BRANDS).flatMap(b => b.ocr_keys)

/**
 * Returns true if this AI candidate is a hand-shaken / bubble tea drink.
 */
export function isHandShakeDrink(candidate) {
  if (!candidate) return false
  const texts = [
    candidate.name     || '',
    candidate.brand    || '',
    ...(candidate.clues      || []),
    ...(candidate.components || []).map(c => c.name || ''),
    candidate.container_clue || '',
  ].join(' ').toLowerCase()

  if (ALL_BRAND_TOKENS.some(k => texts.includes(k.toLowerCase()))) return true
  if (DRINK_KEYWORDS.some(k => texts.includes(k.toLowerCase()))) return true

  // Container shape clues — a sealed cup or straw is almost always a hand-shaken drink
  const containerText = (candidate.container_clue || '').toLowerCase()
  const CUP_SIGNALS = ['杯', 'cup', '封膜', '吸管', '手搖', '外帶']
  if (CUP_SIGNALS.some(s => containerText.includes(s))) return true

  return false
}

// Keep old export name for backward compat
export { isHandShakeDrink as isBubbleTea }

// ── OCR helpers ────────────────────────────────────────────────────────────────
function allCandidateText(c) {
  return [
    c.name || '',
    c.brand || '',
    c.container_clue || '',
    ...(c.clues || []),
    ...(c.components || []).map(x => x.name || ''),
  ].join(' ')
}

// ── Size detection ─────────────────────────────────────────────────────────────
const SIZE_PATTERNS = [
  { key:'l',      re:/大杯|L杯|900|large|特大|XL|jumbo/i },
  { key:'m',      re:/中杯|M杯|700|medium|標準/i },
  { key:'s',      re:/小杯|S杯|400|small/i },
  { key:'bottle', re:/瓶裝|保特瓶|塑膠瓶|bottle/i },
]

function detectSize(text) {
  for (const { key, re } of SIZE_PATTERNS) {
    if (re.test(text)) return key
  }
  return null   // null = unknown, UI will prompt
}

// ── Topping detection ──────────────────────────────────────────────────────────
const TOPPING_ALIASES = {
  '珍珠':   /珍珠|tapioca.*pearl|boba.*pearl|Q珠/i,
  '波霸':   /波霸|jumbo.*pearl|大珍珠/i,
  '小珍珠': /小珍珠|mini.*pearl|小圓/i,
  '仙草':   /仙草|grass.*jelly|herbal.*jelly/i,
  '布丁':   /布丁|pudding|雞蛋布丁/i,
  '椰果':   /椰果|coconut.*jelly|椰凍/i,
  '蘆薈':   /蘆薈|aloe/i,
  '紅豆':   /紅豆|red.*bean/i,
  '芋圓':   /芋圓|taro.*ball/i,
  '奶蓋':   /奶蓋|cheese.*foam|芝士|起司|嗝嗝/i,
  '燕麥':   /燕麥|oat/i,
}

function detectToppings(text, defaultTopping) {
  const found = new Set()
  for (const [key, re] of Object.entries(TOPPING_ALIASES)) {
    if (re.test(text)) found.add(key)
  }
  // 波霸 supersedes 珍珠
  if (found.has('波霸')) found.delete('珍珠')
  if (found.size === 0 && defaultTopping) found.add(defaultTopping)
  return [...found]
}

// ── OCR snippet extraction ─────────────────────────────────────────────────────
function extractOcrSnippets(candidate) {
  const allBrandKeys = Object.keys(BOBA_BRANDS)
  return (candidate.clues || [])
    .filter(cl =>
      DRINK_KEYWORDS.some(k => cl.toLowerCase().includes(k.toLowerCase())) ||
      allBrandKeys.some(b => cl.includes(b))
    )
    .slice(0, 4)
}

// ── Main parse function ────────────────────────────────────────────────────────
/**
 * Parse an AI candidate into a hand-shaken drink order metadata object.
 *
 * @param {object} candidate  AI response candidate
 * @returns {object} meta — brandKey, drinkKey, cat, size, toppings,
 *                          displayBrand, displayDrink, ocrSnippets, confidence
 *
 * NOTE: sugarKey is intentionally NOT set here.
 *       Sugar is always confirmed by the user in the UI.
 */
export function parseBobaMeta(candidate) {
  const fullText = allCandidateText(candidate)

  // 1. Brand from OCR priority: brand field > name > all text
  const brandKey =
    matchBrandKey(candidate.brand) ||
    matchBrandKey(candidate.name)  ||
    (() => {
      for (const key of Object.keys(BOBA_BRANDS)) {
        if (fullText.includes(key)) return key
        if (BOBA_BRANDS[key].ocr_keys.some(k => fullText.toLowerCase().includes(k.toLowerCase()))) return key
      }
      return null
    })()

  // 2. Drink name → key in brand, or use raw name
  const rawDrinkName = candidate.name || ''
  const drinkKey = brandKey
    ? (matchDrinkKey(brandKey, rawDrinkName) || matchDrinkKey(brandKey, candidate.components?.[0]?.name))
    : null

  // 3. Category — from brand drink → detected from text
  const drink = brandKey && drinkKey ? BOBA_BRANDS[brandKey]?.drinks[drinkKey] : null
  const cat   = drink?.cat || detectCategory(fullText) || 'pearl_milk_tea'

  // 4. Default topping from brand drink definition
  const defaultTopping = drink?.default_topping ?? null

  // 5. Toppings
  const toppings = detectToppings(fullText, defaultTopping)

  // 6. Size — may be null (= will prompt user)
  const size = detectSize(candidate.container_clue || fullText)

  // 7. OCR snippets for display
  const ocrSnippets = extractOcrSnippets(candidate)

  // 8. Confidence tier
  const aiConf  = candidate.confidence ?? 50
  const confidence =
    brandKey && drinkKey ? Math.max(aiConf, 72) :
    brandKey             ? Math.max(aiConf, 55) :
    cat                  ? Math.max(aiConf, 40) :
                           Math.min(aiConf, 38)

  // 9. Display labels
  const displayBrand = brandKey
    ? BOBA_BRANDS[brandKey].display
    : (candidate.brand || null)
  const displayDrink = drinkKey
    || rawDrinkName
    || (cat ? DRINK_CATEGORIES[cat]?.label_zh : null)
    || '手搖飲料'

  return {
    brandKey,
    drinkKey,
    cat,
    size,                   // null means unknown — UI will ask
    sugarKey: null,         // always null — NEVER pre-set, always ask
    iceKey:   null,         // always null — always ask
    toppings,
    displayBrand,
    displayDrink,
    ocrSnippets,
    confidence,
    aiName: candidate.name,
  }
}

// ── Fallback suggestions ───────────────────────────────────────────────────────
/**
 * Returns up to 4 most-likely drink suggestions when confidence is low.
 * Scored by keyword overlap with candidate text.
 */
export function getBobaSuggestions(candidate) {
  const text = allCandidateText(candidate).toLowerCase()
  const catEntries = Object.entries(DRINK_CATEGORIES)

  const scored = catEntries.map(([key, cat]) => {
    let score = cat.keywords.filter(k => text.includes(k.toLowerCase())).length * 20
    // Boost specific signals
    if (key === 'pearl_milk_tea' && (text.includes('珍珠') || text.includes('波霸'))) score += 30
    if (key === 'brown_sugar_milk' && text.includes('黑糖')) score += 40
    if (key === 'cheese_foam' && (text.includes('奶蓋') || text.includes('芝士'))) score += 40
    if (key === 'yakult_tea' && (text.includes('多多') || text.includes('養樂多'))) score += 40
    return { key, ...cat, score }
  }).sort((a, b) => b.score - a.score)

  return scored.slice(0, 4)
}

// ── Build component for ScanModal ──────────────────────────────────────────────
/**
 * Build a 'boba' source component from a confirmed order.
 * Compatible with calcCompNut() routing in ScanModal.
 *
 * @param {object} order  { brandKey, drinkKey, cat, size, sugarKey, iceKey, toppings }
 */
export function buildBobaComponent(order) {
  const nut = calcDrinkTotal(order)
  const sizeML = DRINK_SIZES.find(s => s.key === (order.size || 'm'))?.ml ?? 700
  return {
    name:      nut.label,
    aiName:    order.aiName || nut.label,
    grams:     sizeML,
    baseGrams: sizeML,
    portionMult:   1,
    portionLevel:  'standard',
    correctionDir: null,
    calEst:   nut.calories,
    proEst:   nut.protein,
    carbEst:  nut.carbs,
    fatEst:   nut.fat,
    source:   'boba',
    bobaOrder: { ...order },
    bobaTotal: nut,
    fdaItem:   null, nycuDish: null, portionItem: null,
    portionConf:   75,
    portionReason: `手搖飲料資料庫 — ${nut.label}`,
  }
}

// Re-export all constants needed by ScanModal
export {
  BOBA_BRANDS, BOBA_TOPPINGS, BOBA_QUICK_CHIPS,
  DRINK_CATEGORIES, DRINK_SIZES, SUGAR_LEVELS, ICE_LEVELS,
  calcDrinkTotal,
}
