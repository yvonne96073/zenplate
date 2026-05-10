const BASE = 'https://foodsafety.family.com.tw/Web_FFD_2022/ws'

export function isFamilyMartContext(str) {
  const s = (str || '').toLowerCase()
  return s.includes('family') || s.includes('全家') || s.includes('familymart')
}

export function parseCalFromNote(note) {
  const m = (note || '').match(/熱量(\d+)大卡/)
  return m ? parseInt(m[1]) : null
}

// Search products by keyword — returns flat list with cal parsed
export async function searchFamilyMart(keyword) {
  try {
    const res = await fetch(`${BASE}/QueryFsProductListByQKQ`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ MEMBER: 'N', KEYWORD: keyword }),
    })
    const data = await res.json()
    if (data.RESULT_CODE !== '00') return []
    return (data.LIST || []).flatMap(cat =>
      (cat.ITEM || []).map(item => ({
        ...item,
        CATEGORY_NAME: cat.CATEGORY_NAME,
        cal: parseCalFromNote(item.NOTE),
      }))
    )
  } catch { return [] }
}

// Fetch full nutrition detail for one CMNO
export async function getFamilyMartNutrition(cmno) {
  try {
    const res = await fetch(`${BASE}/QueryFsProductByItem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CMNO: cmno }),
    })
    const data = await res.json()
    if (data.RESULT_CODE !== '00' || !data.LIST?.length) return null
    const item = data.LIST[0]
    const nut  = item.NUTRIENTS?.[0]
    if (!nut) return null
    return {
      name:     item.PRODNAME,
      cmno:     item.CMNO,
      category: item.CATEGORY_NAME,
      calories: parseCalFromNote(item.NOTE) || 0,
      protein:  +(nut.PROTEIN      || 0),
      fat:      +(nut.TOTALFAT     || 0),
      carbs:    +(nut.CARBOHYDRATE || 0),
      sodium:   +(nut.SODIUM       || 0),
      sugar:    +(nut.SUGAR        || 0),
    }
  } catch { return null }
}
