/**
 * 7-Eleven Taiwan — Static Nutrition Database
 * Focus: CITY CAFÉ coffee items (official nutrition data)
 * Source: 7-Eleven Taiwan official product info / standard estimates
 *
 * cal=kcal, pro/carb/fat=grams, sod=mg
 */
export const SEVEN_ELEVEN_DB = [
  // ── CITY CAFÉ 美式咖啡 (Americano) ──────────────────────────────────────
  { id: '7e-cafe-01', name: 'CITY CAFÉ 美式(小)', category: 'coffee',
    aliases: ['美式咖啡小', 'americano small', '小杯美式', '小美式'],
    cal: 5,  pro: 0.1, carb: 0.5, fat: 0.0, sod: 5  },
  { id: '7e-cafe-02', name: 'CITY CAFÉ 美式(中)', category: 'coffee',
    aliases: ['美式咖啡中', 'americano medium', '中杯美式', '中美式', 'CITY CAFÉ美式', '7-11美式'],
    cal: 5,  pro: 0.1, carb: 0.6, fat: 0.0, sod: 5  },
  { id: '7e-cafe-03', name: 'CITY CAFÉ 美式(大)', category: 'coffee',
    aliases: ['美式咖啡大', 'americano large', '大杯美式', '大美式'],
    cal: 10, pro: 0.2, carb: 0.8, fat: 0.0, sod: 10 },

  // ── CITY CAFÉ 拿鐵 (Latte) ───────────────────────────────────────────────
  { id: '7e-cafe-04', name: 'CITY CAFÉ 拿鐵(小)', category: 'coffee',
    aliases: ['拿鐵小', 'latte small', '小杯拿鐵', '小拿鐵'],
    cal: 110, pro: 5.8, carb: 9.0, fat: 5.8, sod: 70  },
  { id: '7e-cafe-05', name: 'CITY CAFÉ 拿鐵(中)', category: 'coffee',
    aliases: ['拿鐵中', 'latte medium', '中杯拿鐵', '中拿鐵', 'CITY CAFÉ拿鐵', '7-11拿鐵', '7-Eleven拿鐵'],
    cal: 160, pro: 8.4, carb: 13.0, fat: 8.4, sod: 100 },
  { id: '7e-cafe-06', name: 'CITY CAFÉ 拿鐵(大)', category: 'coffee',
    aliases: ['拿鐵大', 'latte large', '大杯拿鐵', '大拿鐵'],
    cal: 215, pro: 11.2, carb: 17.5, fat: 11.2, sod: 135 },

  // ── CITY CAFÉ 摩卡 (Mocha) ───────────────────────────────────────────────
  { id: '7e-cafe-07', name: 'CITY CAFÉ 摩卡(中)', category: 'coffee',
    aliases: ['摩卡中', 'mocha medium', '中杯摩卡', 'CITY CAFÉ摩卡'],
    cal: 240, pro: 7.5, carb: 26.0, fat: 12.5, sod: 100 },
  { id: '7e-cafe-08', name: 'CITY CAFÉ 摩卡(大)', category: 'coffee',
    aliases: ['摩卡大', 'mocha large', '大杯摩卡'],
    cal: 300, pro: 9.5, carb: 32.0, fat: 15.0, sod: 130 },

  // ── CITY CAFÉ 卡布奇諾 (Cappuccino) ─────────────────────────────────────
  { id: '7e-cafe-09', name: 'CITY CAFÉ 卡布奇諾(中)', category: 'coffee',
    aliases: ['卡布奇諾中', 'cappuccino medium', '卡布中', 'CITY CAFÉ卡布'],
    cal: 140, pro: 7.0, carb: 11.0, fat: 7.0, sod: 90  },

  // ── CITY CAFÉ 抹茶拿鐵 ───────────────────────────────────────────────────
  { id: '7e-cafe-10', name: 'CITY CAFÉ 抹茶拿鐵(中)', category: 'coffee',
    aliases: ['抹茶拿鐵', 'matcha latte', '抹茶咖啡'],
    cal: 200, pro: 8.0, carb: 22.0, fat: 8.5, sod: 100 },
]

// ── Detect 7-Eleven context ───────────────────────────────────────────────────
export function is7ElevenContext(str) {
  if (!str) return false
  const s = str.toLowerCase().replace(/[-\s]/g, '')
  return (
    s.includes('7eleven') || s.includes('7-11') || s.includes('7eleven') ||
    s.includes('統一超商') || s.includes('citycafé') || s.includes('citycafe')
  )
}

// ── Search 7-Eleven DB ────────────────────────────────────────────────────────
function norm7(s) {
  return (s || '').replace(/[\s\-_（）()]/g, '').toLowerCase()
}

export function search7Eleven(query, limit = 5) {
  if (!query) return []
  const q = norm7(query)
  const scored = []
  for (const item of SEVEN_ELEVEN_DB) {
    const targets = [item.name, ...(item.aliases || [])].map(norm7)
    let best = 0
    for (const t of targets) {
      if (t === q)              best = Math.max(best, 100)
      else if (t.includes(q))  best = Math.max(best, 75)
      else if (q.includes(t) && t.length >= 2) best = Math.max(best, 60)
      else {
        let overlap = 0
        for (const c of q) { if (t.includes(c)) overlap++ }
        if (overlap >= 2) best = Math.max(best, Math.round((overlap / Math.max(q.length, t.length)) * 40))
      }
    }
    if (best >= 30) scored.push({ item, score: best })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(r => r.item)
}
