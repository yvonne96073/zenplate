/**
 * 台灣常見包裝食品營養資料庫
 * 來源：各品牌官網、包裝營養標示
 * 單位：per 100g（液體 per 100ml），calories = kcal
 *
 * 格式：
 *   id       唯一識別
 *   brand    品牌名（中文）
 *   name     產品名稱（中文）
 *   aliases  別名 / 搜尋關鍵字
 *   per      每份克數（標準份量）
 *   cal100   每 100g 熱量 kcal
 *   pro100   每 100g 蛋白質 g
 *   carb100  每 100g 碳水化合物 g
 *   fat100   每 100g 脂肪 g
 *   sod100   每 100g 鈉 mg
 */

export const PACKAGED_FOODS = [
  // ─── 義美 I-Mei ───────────────────────────────────────
  {
    id: 'imei-xianru-baobing',
    brand: '義美',
    name: '鮮乳薄餅',
    aliases: ['義美薄餅', '鮮奶薄餅', '牛奶薄餅', 'I-Mei鮮乳薄餅'],
    per: 50,
    cal100: 504, pro100: 7.2, carb100: 67.4, fat100: 22.4, sod100: 295,
  },
  {
    id: 'imei-egg-roll',
    brand: '義美',
    name: '小泡芙',
    aliases: ['義美小泡芙', '義美泡芙'],
    per: 45,
    cal100: 505, pro100: 6.0, carb100: 62.3, fat100: 25.7, sod100: 210,
  },
  {
    id: 'imei-peanut-cookie',
    brand: '義美',
    name: '花生夾心餅',
    aliases: ['義美花生餅', '花生夾心'],
    per: 50,
    cal100: 532, pro100: 10.2, carb100: 62.1, fat100: 27.3, sod100: 380,
  },
  {
    id: 'imei-big-waffle',
    brand: '義美',
    name: '大鬆餅',
    aliases: ['義美鬆餅', '義美大鬆餅'],
    per: 55,
    cal100: 430, pro100: 7.5, carb100: 66.0, fat100: 15.8, sod100: 400,
  },
  {
    id: 'imei-choco-pie',
    brand: '義美',
    name: '巧克力派',
    aliases: ['義美巧克力派', '義美派'],
    per: 32,
    cal100: 452, pro100: 4.6, carb100: 62.5, fat100: 20.0, sod100: 260,
  },
  {
    id: 'imei-soda-cracker',
    brand: '義美',
    name: '小蘇打餅',
    aliases: ['義美蘇打餅', '義美小蘇打'],
    per: 38,
    cal100: 463, pro100: 8.3, carb100: 70.5, fat100: 15.9, sod100: 710,
  },

  // ─── 統一 Uni-President ───────────────────────────────
  {
    id: 'uni-kexue-mian',
    brand: '統一',
    name: '科學麵',
    aliases: ['科學麵', '統一科學麵'],
    per: 45,
    cal100: 479, pro100: 9.4, carb100: 57.3, fat100: 23.4, sod100: 1280,
  },
  {
    id: 'uni-man-han',
    brand: '統一',
    name: '滿漢大餐',
    aliases: ['滿漢大餐', '統一滿漢'],
    per: 200,
    cal100: 410, pro100: 8.8, carb100: 55.2, fat100: 17.6, sod100: 1050,
  },
  {
    id: 'uni-77-choc',
    brand: '77',
    name: '乳加巧克力',
    aliases: ['77乳加', '77巧克力', '乳加'],
    per: 40,
    cal100: 512, pro100: 7.0, carb100: 62.4, fat100: 25.5, sod100: 130,
  },

  // ─── 光泉 Kuang Chuan ──────────────────────────────────
  {
    id: 'kc-fresh-milk-full',
    brand: '光泉',
    name: '鮮乳（全脂）',
    aliases: ['光泉牛奶', '光泉全脂鮮乳', '光泉鮮奶'],
    per: 240,
    cal100: 62, pro100: 3.0, carb100: 4.8, fat100: 3.6, sod100: 45,
  },
  {
    id: 'kc-fresh-milk-low',
    brand: '光泉',
    name: '低脂鮮乳',
    aliases: ['光泉低脂牛奶', '光泉低脂鮮奶'],
    per: 240,
    cal100: 45, pro100: 3.2, carb100: 4.8, fat100: 1.5, sod100: 48,
  },

  // ─── 林鳳營 / 味全 ────────────────────────────────────
  {
    id: 'weichuan-fresh-milk',
    brand: '味全',
    name: '鮮乳（全脂）',
    aliases: ['味全牛奶', '味全全脂鮮乳', '林鳳營鮮乳', '林鳳營牛奶'],
    per: 240,
    cal100: 62, pro100: 3.0, carb100: 4.8, fat100: 3.6, sod100: 44,
  },

  // ─── 波蜜 / 黑松 ──────────────────────────────────────
  {
    id: 'blackmatsu-cola',
    brand: '黑松',
    name: '黑松沙士',
    aliases: ['沙士', '黑松沙士'],
    per: 330,
    cal100: 41, pro100: 0, carb100: 10.2, fat100: 0, sod100: 12,
  },

  // ─── 可口可樂系列 ─────────────────────────────────────
  {
    id: 'coca-cola',
    brand: '可口可樂',
    name: '可口可樂',
    aliases: ['可樂', 'Coca-Cola', 'coke'],
    per: 330,
    cal100: 42, pro100: 0, carb100: 10.6, fat100: 0, sod100: 10,
  },
  {
    id: 'coca-cola-zero',
    brand: '可口可樂',
    name: '零卡可樂',
    aliases: ['零卡', 'Coke Zero', '可口可樂零卡'],
    per: 330,
    cal100: 1, pro100: 0, carb100: 0.1, fat100: 0, sod100: 14,
  },

  // ─── 乖乖 ─────────────────────────────────────────────
  {
    id: 'guai-guai-corn',
    brand: '乖乖',
    name: '奶油玉米口味',
    aliases: ['乖乖', '奶油乖乖', '玉米乖乖'],
    per: 100,
    cal100: 516, pro100: 5.9, carb100: 70.5, fat100: 23.0, sod100: 560,
  },

  // ─── 卡迪那 ───────────────────────────────────────────
  {
    id: 'cadina-chips',
    brand: '卡迪那',
    name: '洋芋片',
    aliases: ['卡迪那洋芋片', '卡迪那'],
    per: 50,
    cal100: 536, pro100: 5.8, carb100: 56.2, fat100: 32.0, sod100: 470,
  },

  // ─── Lay's ────────────────────────────────────────────
  {
    id: 'lays-original',
    brand: "Lay's",
    name: '原味洋芋片',
    aliases: ["Lays", "lay's", "洋芋片", "樂事洋芋片", "樂事"],
    per: 50,
    cal100: 536, pro100: 6.4, carb100: 55.0, fat100: 31.6, sod100: 504,
  },

  // ─── 7-11 / 超商鮮食 ──────────────────────────────────
  {
    id: 'cv-onigiri-tuna',
    brand: '超商',
    name: '鮪魚飯糰',
    aliases: ['鮪魚飯糰', '便利商店飯糰', '7-11飯糰'],
    per: 110,
    cal100: 185, pro100: 5.5, carb100: 32.0, fat100: 4.2, sod100: 380,
  },

  // ─── 馬偕 / 泰山 ──────────────────────────────────────
  {
    id: 'taisun-pudding',
    brand: '泰山',
    name: '仙草凍',
    aliases: ['泰山仙草', '仙草凍', '仙草'],
    per: 265,
    cal100: 27, pro100: 0.2, carb100: 6.5, fat100: 0, sod100: 40,
  },

  // ─── 維力 ─────────────────────────────────────────────
  {
    id: 'vedan-instant',
    brand: '維力',
    name: '炸醬麵',
    aliases: ['維力炸醬麵', '炸醬麵'],
    per: 90,
    cal100: 430, pro100: 9.0, carb100: 62.0, fat100: 16.0, sod100: 1100,
  },
]

/**
 * 搜尋包裝食品
 * @param {string} brandName  AI 辨識的品牌名
 * @param {string} productName AI 辨識的產品名
 * @returns {{ item, score } | null}
 */
export function lookupPackagedFood(brandName = '', productName = '') {
  const query = `${brandName} ${productName}`.toLowerCase().replace(/\s+/g, '')

  let best = null
  let bestScore = 0

  for (const item of PACKAGED_FOODS) {
    const candidates = [
      `${item.brand}${item.name}`,
      ...item.aliases,
    ]

    for (const c of candidates) {
      const normalized = c.toLowerCase().replace(/\s+/g, '')
      const score = fuzzyScore(query, normalized)
      if (score > bestScore) {
        bestScore = score
        best = item
      }
    }
  }

  // 需要 60% 相似度才算命中
  return bestScore >= 0.6 ? { item: best, score: bestScore } : null
}

/**
 * 簡易模糊評分（0~1）：共用字元比例
 */
function fuzzyScore(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1

  // 包含關係
  if (b.includes(a) || a.includes(b)) {
    const shorter = Math.min(a.length, b.length)
    const longer  = Math.max(a.length, b.length)
    return shorter / longer
  }

  // 計算共用字元數
  const setA = new Set(a.split(''))
  const setB = new Set(b.split(''))
  const intersection = [...setA].filter(c => setB.has(c))
  return intersection.length / Math.max(setA.size, setB.size)
}
