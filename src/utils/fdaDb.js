/**
 * Taiwan FDA Food Nutrition Database 2025 UPDATE1
 * 2213 foods — all values per 100g edible portion
 *
 * Compact JSON schema:
 *   id, n(nameZh), cat(category), a(aliases[]),
 *   cal, pro, carb, fat, fib, sug, sod, satFat, chol
 */

let _db = null          // raw array, loaded once
let _idx = null         // name+alias → index map

// ── Lazy load ─────────────────────────────────────────────────────────────────
export async function loadFdaDb() {
  if (_db) return _db
  const res = await fetch('/data/fdaNutrition.json')
  if (!res.ok) throw new Error('Failed to load FDA nutrition database')
  _db = await res.json()
  _buildIndex()
  return _db
}

function _buildIndex() {
  _idx = new Map()
  _db.forEach((item, i) => {
    // Primary name
    const key = _normalize(item.n)
    if (!_idx.has(key)) _idx.set(key, i)
    // Aliases
    if (item.a) {
      item.a.forEach(alias => {
        const ak = _normalize(alias)
        if (!_idx.has(ak)) _idx.set(ak, i)
      })
    }
  })
}

// ── Normalize for matching (remove spaces, punctuation, lowercase) ─────────────
function _normalize(str) {
  return (str || '').replace(/[\s\-_()（）【】、，,。.\/\\]/g, '').toLowerCase()
}

// ── Exact / alias lookup ──────────────────────────────────────────────────────
export function lookupByName(name) {
  if (!_idx) return null
  const key = _normalize(name)
  const i = _idx.get(key)
  return i !== undefined ? _db[i] : null
}

export function lookupById(id) {
  if (!_db) return null
  return _db.find(r => r.id === id) || null
}

// ── Fuzzy search (substring, returns top N) ────────────────────────────────────
export function searchFda(query, limit = 20) {
  if (!_db || !query.trim()) return []
  const q = _normalize(query)
  const results = []

  for (const item of _db) {
    const nameParts = [_normalize(item.n), ...(item.a || []).map(_normalize)]
    const score = _score(q, nameParts)
    if (score > 0) results.push({ item, score })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit).map(r => r.item)
}

function _score(query, parts) {
  let best = 0
  for (const p of parts) {
    if (p === query)          best = Math.max(best, 100)  // exact
    else if (p.startsWith(query)) best = Math.max(best, 80)   // prefix
    else if (p.includes(query))   best = Math.max(best, 50)   // substring
    else if (query.includes(p) && p.length >= 2) best = Math.max(best, 30)
  }
  return best
}

// ── Calculate nutrition for a given food item + grams ─────────────────────────
/**
 * @param {object} item  FDA record
 * @param {number} grams Amount in grams
 * @returns {object}     Nutrition facts for that amount
 */
export function calcNutrition(item, grams) {
  const ratio = grams / 100
  const n = (field) => {
    const v = item[field]
    return v != null ? Math.round(v * ratio * 10) / 10 : null
  }
  return {
    foodId:    item.id,
    nameZh:    item.n,
    category:  item.cat,
    grams,
    calories:  n('cal'),
    protein:   n('pro'),
    carbs:     n('carb'),
    fat:       n('fat'),
    fiber:     n('fib'),
    sugar:     n('sug'),
    sodium:    n('sod'),
    satFat:    n('satFat'),
    cholesterol: n('chol'),
    source:    'Taiwan FDA 2025 UPDATE1',
  }
}

// ── Sum nutrition from multiple items ─────────────────────────────────────────
export function sumNutrition(items) {
  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0,
                fiber: 0, sugar: 0, sodium: 0 }
  for (const item of items) {
    for (const k of Object.keys(sum)) {
      if (item[k] != null) sum[k] += item[k]
    }
  }
  for (const k of Object.keys(sum)) {
    sum[k] = Math.round(sum[k] * 10) / 10
  }
  return sum
}

// ── Category display map ──────────────────────────────────────────────────────
export const CATEGORY_EMOJI = {
  '穀物類':       '🌾',
  '澱粉類':       '🍠',
  '糖類':         '🍬',
  '豆類':         '🫘',
  '堅果及種子類': '🥜',
  '蔬菜類':       '🥦',
  '菇類':         '🍄',
  '藻類':         '🌿',
  '水果類':       '🍎',
  '肉類':         '🥩',
  '蛋類':         '🥚',
  '魚貝類':       '🐟',
  '乳品類':       '🥛',
  '油脂類':       '🫙',
  '調味料及香辛料類': '🧂',
  '飲料類':       '🧃',
  '糕餅點心類':   '🍰',
  '加工調理食品及其他類': '🍱',
}

// ── Common Taiwanese dish → ingredient breakdown ──────────────────────────────
// Used as fallback hints when AI decomposition is unavailable
export const DISH_DECOMPOSITION = {
  '雞肉便當': [
    { name: '白飯', grams: 200 },
    { name: '雞腿', grams: 100 },
    { name: '空心菜', grams: 50 },
    { name: '滷蛋', grams: 55 },
  ],
  '排骨便當': [
    { name: '白飯', grams: 200 },
    { name: '豬排骨', grams: 100 },
    { name: '高麗菜', grams: 60 },
  ],
  '控肉飯': [
    { name: '白飯', grams: 200 },
    { name: '豬五花肉', grams: 80 },
    { name: '滷蛋', grams: 55 },
  ],
  '魯肉飯': [
    { name: '白飯', grams: 200 },
    { name: '豬絞肉', grams: 60 },
  ],
  '蛋炒飯': [
    { name: '白飯', grams: 200 },
    { name: '雞蛋', grams: 60 },
    { name: '沙拉油', grams: 10 },
  ],
  '牛肉麵': [
    { name: '麵條', grams: 150 },
    { name: '牛腱', grams: 100 },
    { name: '青江菜', grams: 40 },
  ],
  '水餃': [
    { name: '水餃', grams: 180 },  // 10 pieces ≈ 180g
  ],
  '便當': [
    { name: '白飯', grams: 200 },
    { name: '豬肉', grams: 80 },
    { name: '高麗菜', grams: 60 },
  ],
}
