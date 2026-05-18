import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'
import { loadFdaDb, lookupByName, searchFda, calcNutrition, CATEGORY_EMOJI } from '../utils/fdaDb'
import { matchNycuDish, isNycuContext, searchNycuDb } from '../utils/nycuDb'
import { is7ElevenContext, search7Eleven } from '../utils/sevenElevenDb'
import { lookupPackagedFood, lookupPackagedFoodCandidates, debugScoreAll } from '../data/packagedFoods'
import { isSubwayContext, matchSubwayItems, calcSubwayMeal, SUBWAY_DB, subwayByCategory } from '../utils/subwayDb'
import { isMcdonaldsContext, matchMcdonaldsItem } from '../utils/mcdonaldsDb'
import { isFamilyMartContext, searchFamilyMart, getFamilyMartNutrition } from '../utils/familymartDb'
import { lookupComponent, compNutrition, COMPONENT_ID_LIST } from '../utils/portionDb'
import { calcPlateScore, scoreInfo, getScoreBreakdown } from '../utils/scoring'
import { loadPortionAdjustments, savePortionCorrections, hasPersonalization } from '../utils/portionLearning'
import { GEMINI_FALLBACK_MODELS } from '../config/ai'
import {
  isHandShakeDrink as isBubbleTea, parseBobaMeta, buildBobaComponent, getBobaSuggestions,
  BOBA_TOPPINGS, BOBA_BRANDS,
  DRINK_CATEGORIES, DRINK_SIZES, SUGAR_LEVELS, ICE_LEVELS, calcDrinkTotal,
} from '../utils/bubbleTeaPipeline'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const MEAL_TYPES   = ['早餐', '午餐', '晚餐', '點心']
const MEAL_TYPE_V  = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '點心': 'snack' }

function getDefaultMealType() {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return '早餐'
  if (h >= 11 && h < 15) return '午餐'
  if (h >= 15 && h < 21) return '晚餐'
  return '點心'
}

// ── Vision prompt — Portion Science v2 ───────────────────────────────────────
const VISION_PROMPT = `你是台灣 AI 營養師。每次分析必須完成：
1. 判斷食物類型（packaged_food / chain_restaurant / general_meal）
2. 辨識食物身份與品項
3. 從畫面視覺估算實際份量（g）

份量估算方法（依優先順序）：
- 密封包裝 → 讀包裝上的克數
- 標準容器（便當盒/碗/盤）→ 根據容器大小與填滿程度估算
- 參考物（筷子/手/湯匙）→ 用比例推算
- 台灣常見份量習慣（白飯1碗≈200g、雞腿≈120g、豬排≈100g、青菜1份≈80g、醬汁≈15g）

已知 component_id（食材 name 欄位盡量用以下英文 ID）：
${COMPONENT_ID_LIST}

只回傳 JSON（不加任何說明或 markdown）：
{
  "candidates": [
    {
      "food_type": "general_meal",
      "name": "餐點名稱（中文）",
      "confidence": 80,
      "container_clue": "便當盒，七分滿",
      "needs_confirmation": false,
      "clues": ["食物辨識依據"],
      "packaged": false,
      "brand": "",
      "components": [
        {
          "name": "white_rice",
          "grams": 220,
          "portion_confidence": 75,
          "portion_reason": "標準碗，八分滿，約220g",
          "cal_est": null,
          "pro_est": null,
          "carb_est": null,
          "fat_est": null
        }
      ]
    }
  ]
}

規則：
1. 永遠回傳 3 個 candidates，由高到低信心度排序；3 個 candidates 必須是完全不同的食物（例如：蘋果片、梨子片、芭樂片），絕對禁止重複同一種食物名稱或近似名稱（禁止：蘋果片 90%、蘋果片 85%、蘋果片 80%）
2. food_type 必須是：packaged_food / chain_restaurant / general_meal 三選一
3. confidence / portion_confidence：0-100 整數
4. portion_confidence 判斷基準：
   80+ = 密封包裝、完整餐盒、份量明確
   55-79 = 大致可判斷（家常菜、標準碗盤）
   30-54 = 不確定（混合料理、醬汁、看不清的配料）
5. needs_confirmation = true 當：portion_confidence 平均 < 60 或 confidence < 65
6. grams = 畫面中實際份量的視覺估算，不是資料庫標準份量
7. portion_reason = 簡短說明份量估算依據（例：「標準碗，八分滿，約220g」）
8. 不要在 components 裡計算卡路里或巨量營養素，只給份量
9. 多個食物 → components 分列每個品項，每個都要估算 grams 和 portion_confidence
10. 【包裝食品偵測】看到任何有包裝的食品（洋芋片袋、泡麵袋/碗/杯、餅乾盒、飲料瓶/罐、牛奶盒、飯糰包裝）→ packaged:true，food_type:"packaged_food"。【OCR非常重要】：仔細讀取包裝上所有可見文字，包含：品牌logo（如統一、義美、光泉、維力、日清、農心、卡迪那、乖乖、旺旺）、產品名稱（正面大字）、口味描述、淨重/份量標示。brand 填品牌名，name 填完整產品名稱，clues 填所有OCR到的文字片段（即使不完整也填入），container_clue 填包裝視覺特徵（如：「紅色袋裝」「黃色大碗泡麵」「筒裝洋芋片」）
11. 就算不確定也要給最佳猜測，不可回傳空 candidates
12. component name 欄位：優先用上方清單的英文 ID，找不到才用中文
13. 看到 Subway 店面/包裝/logo → food_type:"chain_restaurant"，brand 填 "Subway"，name 填菜單品項中文名稱
14. 看到 McDonald's/麥當勞 店面/包裝/logo → food_type:"chain_restaurant"，brand 填 "McDonald's"，name 填菜單品項中文名稱（如：大麥克、麥克鷄塊、薯條）
15. cal_est/pro_est/carb_est/fat_est：只在 name 為中文且完全找不到對應 component_id 時填入（該 grams 份量的總估計值，不是每100g）；有 component_id 匹配就填 null
16. 看到全家/FamilyMart 店面/包裝/logo → food_type:"chain_restaurant"，brand 填 "FamilyMart"，name 填商品名稱（如：鮪魚飯糰、雞腿便當、關東煮）
17. 看到交大/陽明交大/NYCU/交大餐廳/學餐/菁英餐廳/味仙/和食軒/阿嬤的飯桶/太祖/好時光/強尼兄弟/拉亞漢堡 → food_type:"chain_restaurant"，brand 填 "NYCU"，name 填完整中文餐點名稱（如：炸雞腿排套餐、拿鐵咖啡、牛肉丼飯）
18. 看到 7-Eleven/7-11/統一超商/CITY CAFÉ 店面/包裝/logo → food_type:"chain_restaurant"，brand 填 "7-Eleven"，name 填商品名稱（如：CITY CAFÉ拿鐵、CITY CAFÉ美式、茶葉蛋）
19. 【手搖飲料偵測】看到下列任一視覺特徵 → 立刻判定為手搖飲料，food_type:"chain_restaurant"：(a)有封膜的外帶杯；(b)插著吸管的塑膠/紙杯；(c)杯身印有品牌logo/貼紙；(d)黃色杯身+藍色圓點圖案（50嵐）；(e)任何明顯的飲料外帶杯形狀。【OCR第一優先，非常重要】：仔細讀取杯身、貼紙、封膜、logo上的每一個文字，常見品牌：50嵐（黃杯藍點）、CoCo都可、麻古茶坊、清心福全、迷客夏（紫）、得正、茶湯會、老虎堂、一沐日、可不可熟成茶館、珍煮丹、春水堂、大苑子、先喝道、貢茶。brand填品牌名（如：50嵐），name填飲料名（如：四季春、鮮奶茶、珍珠奶茶），container_clue填杯型（小杯/中杯/大杯），clues填所有OCR到的文字片段（品牌名、飲料名、甜度、冰量、貼紙上任何文字），components填一個品項（name=飲料名，grams=400小/700中/900大）。`

// ── Food type badges ──────────────────────────────────────────────────────────
const FOOD_TYPE_LABEL = {
  packaged_food:    '📦 包裝食品',
  chain_restaurant: '🍔 連鎖餐廳',
  general_meal:     '🍽️ 一般餐點',
}

// ── Portion level system ──────────────────────────────────────────────────────
const LEVEL_FACTORS = { light: 0.65, standard: 1.0, extra: 1.5 }

// Compute grams for a given level relative to a component's baseGrams
function getPortionGramsForLevel(comp, level) {
  const factor = LEVEL_FACTORS[level]
  if (comp.source === 'portion' && comp.portionItem?.portions) {
    const sz = level === 'light' ? 'small' : level === 'extra' ? 'large' : 'medium'
    return comp.portionItem.portions[sz] ?? Math.round((comp.baseGrams || 100) * factor)
  }
  return Math.round((comp.baseGrams || 100) * factor)
}

// Apply a level tap — updates grams, portionMult, portionLevel, correctionDir
function applyLevel(comp, level) {
  const grams      = getPortionGramsForLevel(comp, level)
  const portionMult = LEVEL_FACTORS[level]
  const correctionDir = level === 'light' ? 'smaller' : level === 'extra' ? 'larger' : null
  return { ...comp, portionLevel: level, grams, portionMult, correctionDir }
}

// ── Source metadata ───────────────────────────────────────────────────────────
const SRC_LABEL = { fda: 'FDA', nycu: '交大', packaged: '包裝', ai: 'AI估算', subway: 'Subway官方', portion: '份量庫', mcd: '麥當勞官方', family: '全家官方', seven: '7-Eleven官方', boba: '手搖飲料庫' }
const SRC_COLOR = { fda: '#2BB5A0', nycu: '#4CAF50', packaged: '#FF9800', ai: '#9E9E9E', subway: '#00833D', portion: '#7C3AED', mcd: '#DA291C', family: '#009944', seven: '#EE1C25', boba: '#FF6B6B' }

// ── Default Subway config ─────────────────────────────────────────────────────
const DEFAULT_SUBWAY = { sandwichId: null, breadId: 'bread_white', sauceIds: [], sizeMult: 1 }

// ── Build a component from FamilyMart official nutrition data ─────────────────
function buildFamilyComp(nut) {
  // Sanity cap: FamilyMart single item shouldn't exceed 1500 kcal
  const safeCal = nut.calories > 1500 ? null : nut.calories
  if (nut.calories > 1500) {
    console.warn('[SCAN] FamilyMart calorie sanity cap triggered:', nut.name, nut.calories, '→ null')
  }
  return {
    name: nut.name, aiName: nut.name,
    grams: 1, baseGrams: 1,
    portionMult: 1, portionLevel: 'standard', correctionDir: null,
    calEst: safeCal ?? 0, source: 'family', familyItem: { ...nut, calories: safeCal ?? 0 },
    fdaItem: null, nycuDish: null, portionItem: null,
    portionConf: safeCal ? 95 : 40, portionReason: safeCal ? '全家便利商店官方營養資料' : '⚠️ 熱量資料異常，請手動確認',
  }
}

// ── Build a component from NYCU official nutrition data ───────────────────────
function buildNycuComp(nycuResult) {
  const { dish } = nycuResult
  return {
    name: dish.dishZh, aiName: dish.dishZh,
    grams: 1, baseGrams: 1,
    portionMult: 1, portionLevel: 'standard', correctionDir: null,
    calEst: dish.cal, source: 'nycu', nycuDish: dish,
    fdaItem: null, portionItem: null,
    portionConf: 90, portionReason: `交大${dish.restaurantZh || ''}官方營養資料`,
  }
}

// ── Build a component from packaged food DB ───────────────────────────────────
function buildPackagedComp(item, cand) {
  return {
    name: `${item.brand} ${item.name}`,
    aiName: cand?.name || item.name,
    grams: item.per, baseGrams: item.per,
    portionMult: 1, portionLevel: 'standard', correctionDir: null,
    calEst: 0, hint: `${item.per}g/份`,
    portionReason: `包裝標示：每份 ${item.per}g`,
    portionConf: 92,
    source: 'packaged', packagedItem: { item, servingG: item.per },
    fdaItem: null, nycuDish: null, portionItem: null,
  }
}

// ── Build a component from 7-Eleven static DB ─────────────────────────────────
function build7ElevenComp(item) {
  return {
    name: item.name, aiName: item.name,
    grams: 1, baseGrams: 1,
    portionMult: 1, portionLevel: 'standard', correctionDir: null,
    calEst: item.cal, source: 'seven', sevenItem: item,
    fdaItem: null, nycuDish: null, portionItem: null, familyItem: null,
    portionConf: 90, portionReason: '7-Eleven 官方營養資料',
  }
}

// ── Deduplicate AI candidates by name similarity ─────────────────────────────
function normCandName(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[（）()\s\-_,.，。！？!?]/g, '')
    .replace(/切片|片|塊|小份|中份|大份|small|medium|large/g, '')
}

function deduplicateCandidates(cands) {
  if (!cands?.length) return cands
  const kept = []
  for (const c of cands) {
    const cn = normCandName(c.name)
    const isDupe = kept.some(r => {
      const rn = normCandName(r.name)
      if (cn === rn) return true
      // one string contains the other (e.g. "apple" vs "apple slices")
      if (cn.length >= 2 && rn.length >= 2 && (cn.includes(rn) || rn.includes(cn))) return true
      // char overlap ≥ 85 % of the shorter string
      const [shorter, longer] = cn.length <= rn.length ? [cn, rn] : [rn, cn]
      if (shorter.length >= 3) {
        const overlap = [...shorter].filter(ch => longer.includes(ch)).length
        if (overlap / shorter.length >= 0.85) return true
      }
      return false
    })
    if (!isDupe) kept.push(c)
  }
  return kept.slice(0, 3)
}

// ── Confidence display label ──────────────────────────────────────────────────
function confLabel(confidence, rank) {
  if (typeof confidence === 'number' && confidence > 0) return `${confidence}%`
  return rank === 0 ? 'likely' : rank === 1 ? 'possible' : 'less likely'
}

// ── Enrich one AI component with DB data ─────────────────────────────────────
function enrichComp(ai, dbReady, adjustments = {}) {
  const rawGrams  = ai.grams || 100
  const adjKey    = (ai.name || '').toLowerCase()
  const adjFactor = adjustments[adjKey] ?? adjustments[ai.name] ?? 1

  // Personalization: bias initial level based on user's correction history
  const initLevel = adjFactor < 0.825 ? 'light' : adjFactor > 1.25 ? 'extra' : 'standard'

  const base = {
    aiName: ai.name,
    baseGrams:    rawGrams,
    grams:        Math.round(rawGrams * LEVEL_FACTORS[initLevel]),
    portionLevel: initLevel,
    portionMult:  LEVEL_FACTORS[initLevel],
    correctionDir: null,                          // only set by explicit user tap
    calEst:   ai.cal_est   || 0,
    hint:     ai.hint      || '',
    portionConf:   ai.portion_confidence ?? 55,
    portionReason: ai.portion_reason     || '',
    proEst:  ai.pro_est  ?? null,
    carbEst: ai.carb_est ?? null,
    fatEst:  ai.fat_est  ?? null,
  }

  // 1. NYCU campus DB — try both English component ID and any Chinese name
  const nycu = matchNycuDish(ai.name) || matchNycuDish(ai.hint || '')
  if (nycu && nycu.score >= 70) {
    console.log('[SCAN] enrichComp NYCU match:', ai.name, '→', nycu.dish.dishZh, 'score:', nycu.score)
    return { ...base, name: nycu.dish.dishZh, source: 'nycu', nycuDish: nycu.dish, fdaItem: null, portionItem: null }
  }

  // 2. Portion DB — snap to closest S/M/L after personalization
  const portionItem = lookupComponent(ai.name)
  if (portionItem) {
    const rawAiG     = ai.grams || portionItem.default_g || portionItem.portions.medium
    const adjustedAiG = Math.round(rawAiG * adjFactor)
    const opts = [
      { level: 'light',    g: portionItem.portions.small  },
      { level: 'standard', g: portionItem.portions.medium },
      { level: 'extra',    g: portionItem.portions.large  },
    ]
    const best = opts.reduce((a, b) => Math.abs(a.g - adjustedAiG) < Math.abs(b.g - adjustedAiG) ? a : b)
    console.log('[SCAN] enrichComp portionDb match:', ai.name, '→', portionItem.name_zh, `${best.g}g`, `(AI said ${rawAiG}g)`)
    // Also look up FDA for fiber data (portionDb has no fiber)
    const fdaForFiber = dbReady
      ? (lookupByName(portionItem.name_zh) || lookupByName(ai.name) || searchFda(portionItem.name_zh, 1)[0] || null)
      : null
    if (fdaForFiber) console.log('[SCAN] portionDb+FDA fiber:', portionItem.name_zh, '→', fdaForFiber.n, `fib=${fdaForFiber.fib}`)
    return {
      ...base,
      name: portionItem.name_zh, source: 'portion', portionItem,
      grams: best.g, baseGrams: rawAiG,
      portionLevel: best.level, portionMult: LEVEL_FACTORS[best.level],
      fdaItem: fdaForFiber, nycuDish: null,
    }
  }

  // 3. FDA DB
  if (dbReady) {
    const fda = lookupByName(ai.name) || (searchFda(ai.name, 1)[0] || null)
    if (fda) {
      console.log('[SCAN] enrichComp FDA match:', ai.name, '→', fda.n, `cal/100g=${fda.cal}`)
      return { ...base, name: fda.n, source: 'fda', fdaItem: fda, nycuDish: null, portionItem: null }
    }
  }

  // 4. AI estimate fallback
  console.log('[SCAN] enrichComp AI fallback:', ai.name, `calEst=${ai.cal_est}`)
  return { ...base, name: ai.name, source: 'ai', fdaItem: null, nycuDish: null, portionItem: null }
}

// ── Nutrition for one component ───────────────────────────────────────────────
function calcCompNut(comp) {
  const m = comp.portionMult ?? 1
  if (comp.source === 'fda' && comp.fdaItem)
    return calcNutrition(comp.fdaItem, comp.grams)
  if (comp.source === 'portion' && comp.portionItem) {
    const nut = compNutrition(comp.portionItem, comp.grams)
    // Get fiber from FDA if available (portionDb has no fiber field)
    const fiber = comp.fdaItem?.fib != null
      ? Math.round(comp.fdaItem.fib * comp.grams / 100 * 10) / 10
      : null
    return { calories: nut.calories, protein: nut.protein, carbs: nut.carbs, fat: nut.fat, fiber }
  }
  if (comp.source === 'nycu' && comp.nycuDish) {
    const d = comp.nycuDish
    return {
      calories: Math.round((d.cal || 0) * m),
      protein:  +((d.pro  || 0) * m).toFixed(1),
      carbs:    +((d.carb || 0) * m).toFixed(1),
      fat:      +((d.fat  || 0) * m).toFixed(1),
      fiber: null,
    }
  }
  if (comp.source === 'mcd' && comp.mcdItem) {
    const item = comp.mcdItem
    const m = comp.portionMult || 1
    return {
      calories: Math.round(item.cal * m),
      protein:  +(item.pro  * m).toFixed(1),
      carbs:    +(item.carb * m).toFixed(1),
      fat:      +(item.fat  * m).toFixed(1),
      fiber:    +(item.fib  * m).toFixed(1),
    }
  }
  if (comp.source === 'family' && comp.familyItem) {
    const item = comp.familyItem
    const m = comp.portionMult || 1
    return {
      calories: Math.round(item.calories * m),
      protein:  +(item.protein * m).toFixed(1),
      carbs:    +(item.carbs   * m).toFixed(1),
      fat:      +(item.fat     * m).toFixed(1),
      fiber:    null,
    }
  }
  if (comp.source === 'seven' && comp.sevenItem) {
    const item = comp.sevenItem
    const m = comp.portionMult || 1
    return {
      calories: Math.round(item.cal * m),
      protein:  +(item.pro  * m).toFixed(1),
      carbs:    +(item.carb * m).toFixed(1),
      fat:      +(item.fat  * m).toFixed(1),
      fiber:    null,
    }
  }
  if (comp.source === 'packaged' && comp.packagedItem) {
    const { item, servingG } = comp.packagedItem
    const g = (servingG || 100) * m
    return {
      calories: Math.round(item.cal100 * g / 100),
      protein:  +(item.pro100  * g / 100).toFixed(1),
      carbs:    +(item.carb100 * g / 100).toFixed(1),
      fat:      +(item.fat100  * g / 100).toFixed(1),
      fiber: null,
    }
  }
  // Boba — pre-calculated in buildBobaComponent via calcBobaTotal
  if (comp.source === 'boba' && comp.bobaTotal) {
    return {
      calories: comp.bobaTotal.calories,
      protein:  comp.bobaTotal.protein,
      carbs:    comp.bobaTotal.carbs,
      fat:      comp.bobaTotal.fat,
      fiber:    null,
    }
  }
  // AI estimate — use AI macro estimates when available
  return {
    calories: Math.round((comp.calEst  || 0) * m),
    protein:  comp.proEst  != null ? +(comp.proEst  * m).toFixed(1) : null,
    carbs:    comp.carbEst != null ? +(comp.carbEst * m).toFixed(1) : null,
    fat:      comp.fatEst  != null ? +(comp.fatEst  * m).toFixed(1) : null,
    fiber: null,
  }
}

// ── Sum all components ────────────────────────────────────────────────────────
function sumComps(comps) {
  const nuts = comps.map(calcCompNut)
  return {
    calories: Math.round(nuts.reduce((s, n) => s + (n.calories || 0), 0)),
    protein:  nuts.some(n => n.protein != null) ? +nuts.reduce((s, n) => s + (n.protein || 0), 0).toFixed(1) : null,
    carbs:    nuts.some(n => n.carbs   != null) ? +nuts.reduce((s, n) => s + (n.carbs   || 0), 0).toFixed(1) : null,
    fat:      nuts.some(n => n.fat     != null) ? +nuts.reduce((s, n) => s + (n.fat     || 0), 0).toFixed(1) : null,
    fiber:    nuts.some(n => n.fiber   != null && n.fiber > 0)
                ? +nuts.reduce((s, n) => s + (n.fiber || 0), 0).toFixed(1)
                : null,
  }
}

// ── FDA search dropdown ───────────────────────────────────────────────────────
function FdaSearch({ initialQuery = '', onSelect, compact = false }) {
  const [q, setQ]         = useState(initialQuery)
  const [results, setRes] = useState([])
  const [show, setShow]   = useState(false)

  useEffect(() => {
    if (q.trim().length < 1) { setRes([]); return }
    setRes(searchFda(q, 8)); setShow(true)
  }, [q])

  return (
    <div className={`fda-search-wrap ${compact ? 'compact' : ''}`}>
      <input className="fda-search-input" placeholder="搜尋食材..."
        value={q} onChange={e => setQ(e.target.value)} onFocus={() => q && setShow(true)}/>
      {show && results.length > 0 && (
        <div className="fda-search-dropdown">
          {results.map(item => (
            <button key={item.id} className="fda-search-item"
              onMouseDown={() => { setQ(item.n); setShow(false); onSelect(item) }}>
              <span className="fda-search-emoji">{CATEGORY_EMOJI[item.cat] || '🍽️'}</span>
              <span className="fda-search-name">{item.n}</span>
              <span className="fda-search-cal">{item.cal ?? '–'} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component row — Portion Science level UX ──────────────────────────────────
function ComponentRow({ comp, onChange, onRemove, dbReady }) {
  const nut            = calcCompNut(comp)
  const isMcdBased     = comp.source === 'mcd'    && comp.mcdItem
  const isFamilyBased  = (comp.source === 'family' && comp.familyItem) || (comp.source === 'seven' && comp.sevenItem)
  const portionLow     = (comp.portionConf ?? 55) < 55
  const currentLevel = comp.portionLevel || 'standard'

  const levelButtons = [
    { key: 'light',    label: 'Smaller',     g: getPortionGramsForLevel(comp, 'light')    },
    { key: 'standard', label: 'Looks Right', g: getPortionGramsForLevel(comp, 'standard') },
    { key: 'extra',    label: 'Larger',      g: getPortionGramsForLevel(comp, 'extra')    },
  ]

  return (
    <div className="comp-row">
      {/* Header: source badge + name + current gram + remove */}
      <div className="comp-row-header">
        <span className="comp-src-tag" style={{ background: SRC_COLOR[comp.source] }}>
          {SRC_LABEL[comp.source]}
        </span>
        <span className="comp-name">{comp.name}</span>
        <span className="comp-gram-badge">~{comp.grams}g</span>
        <button className="comp-rm" onClick={onRemove}>✕</button>
      </div>

      {/* AI's portion reasoning */}
      {comp.portionReason && (
        <p className="comp-portion-reason">📐 {comp.portionReason}</p>
      )}

      {/* Low-confidence nudge */}
      {portionLow && (
        <p className="comp-portion-warn">份量有點難判斷，確認一下看起來對嗎 🤔</p>
      )}

      {/* ── Portion controls ── */}

      {/* Fixed-portion items (McDonald's / FamilyMart): count +/- */}
      {(isMcdBased || isFamilyBased) ? (
        <div className="count-row">
          <button className="count-btn" onClick={() => onChange({ ...comp, portionMult: Math.max(1, (comp.portionMult || 1) - 1) })}>−</button>
          <span className="count-val">{comp.portionMult || 1} 份</span>
          <button className="count-btn" onClick={() => onChange({ ...comp, portionMult: (comp.portionMult || 1) + 1 })}>＋</button>
        </div>
      ) : (
        /* Everything else: Smaller / Looks Right / Larger */
        <div className="level-row">
          {levelButtons.map(({ key, label, g }) => (
            <button key={key}
              className={`level-btn ${currentLevel === key ? 'active' : ''}`}
              onClick={() => onChange(applyLevel(comp, key))}>
              <span className="level-btn-label">{label}</span>
              <span className="level-btn-gram">~{g}g</span>
            </button>
          ))}
        </div>
      )}

      {/* Nutrition summary */}
      <div className="comp-nut-row">
        <span className="comp-nut-cal">{nut.calories ?? '?'} kcal</span>
        {nut.protein != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">蛋白 {nut.protein}g</span></>}
        {nut.carbs   != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">碳水 {nut.carbs}g</span></>}
        {nut.fat     != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">脂肪 {nut.fat}g</span></>}
        {nut.fiber   != null && nut.fiber > 0 && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">纖維 {nut.fiber}g</span></>}
      </div>

      {/* FDA override: power-user search (secondary) */}
      {comp.source !== 'fda' && comp.source !== 'family' && dbReady && (
        <FdaSearch compact initialQuery={comp.aiName || comp.name}
          onSelect={item => onChange({
            ...comp, name: item.n, source: 'fda', fdaItem: item,
            portionItem: null, nycuDish: null,
            grams: comp.grams, baseGrams: comp.grams,
            portionLevel: comp.portionLevel || 'standard',
            correctionDir: null,
          })}/>
      )}
    </div>
  )
}

// ── Main ScanModal ────────────────────────────────────────────────────────────
export default function ScanModal({ session, onClose, onSaved, defaultMealType }) {
  const [step,      setStep]      = useState('select')  // select|analyzing|candidates|result|barcode
  const [error,     setError]     = useState('')
  const EN_TO_ZH = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' }
  const [mealType,  setMealType]  = useState(
    () => (defaultMealType && EN_TO_ZH[defaultMealType]) || getDefaultMealType()
  )
  const [saving,    setSaving]    = useState(false)
  const [dbReady,   setDbReady]   = useState(false)
  const [scanning,  setScanning]  = useState(false)

  // AI candidates
  const [candidates,         setCandidates]         = useState([])
  const [chosenIdx,          setChosenIdx]          = useState(0)
  const [confirmedCandidate, setConfirmedCandidate] = useState(null)

  // Personalization — user's historical gram-correction factors per component
  const [portionAdjustments, setPortionAdjustments] = useState({})

  // Processed result
  const [mealName,   setMealName]   = useState('')
  const [components, setComponents] = useState([])

  // Barcode fallback
  const [barcodeResult, setBarcodeResult] = useState(null)

  // Subway pipeline
  const [subwayConfig,  setSubwayConfig]  = useState(DEFAULT_SUBWAY)
  const [subwayMatches, setSubwayMatches] = useState([])

  // FamilyMart pipeline
  const [familyMatches,  setFamilyMatches]  = useState([])
  const [familySelected, setFamilySelected] = useState(null)

  // Bubble tea pipeline
  const [bobaMeta,   setBobaMeta]   = useState(null)   // parsed order from AI
  const [bobaOrder,  setBobaOrder]  = useState(null)   // user-confirmed order state

  // Packaged food candidate picker
  const [packagedCandidates, setPackagedCandidates] = useState([])  // top-N ranked candidates

  const videoRef     = useRef(null)
  const codeRef      = useRef(null)
  const fileInputRef = useRef(null)
  const galleryRef   = useRef(null)

  useEffect(() => {
    loadFdaDb().then(() => setDbReady(true)).catch(() => {})
    loadPortionAdjustments(supabase, session.user.id).then(setPortionAdjustments)
    return () => codeRef.current?.reset()
  }, [])

  // ── Barcode scan (unchanged) ──────────────────────────────────────────────
  const startBarcodeScan = async () => {
    setScanning(true); setError('')
    setTimeout(async () => {
      try {
        const reader = new BrowserMultiFormatReader()
        codeRef.current = reader
        await reader.decodeFromVideoDevice(null, videoRef.current, async res => {
          if (res) { reader.reset(); setScanning(false); await lookupBarcode(res.getText()) }
        })
      } catch {
        setError('無法存取相機，請確認已允許相機權限。')
        setScanning(false)
      }
    }, 100)
  }

  const lookupBarcode = async (barcode) => {
    setStep('analyzing')
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product; const n = p.nutriments || {}
        const name = p.product_name || '未知商品'
        setBarcodeResult({
          name,
          calories:  Math.round(n['energy-kcal_100g'] || 0),
          protein_g: +(n.proteins_100g       || 0).toFixed(1),
          carbs_g:   +(n.carbohydrates_100g  || 0).toFixed(1),
          fat_g:     +(n.fat_100g            || 0).toFixed(1),
          fiber_g:   +(n.fiber_100g          || 0).toFixed(1),
        })
        setMealName(name); setStep('barcode')
      } else {
        setError(`找不到條碼 ${barcode}，請改用 AI 拍照。`)
        setStep('select')
      }
    } catch {
      setError('查詢失敗，請確認網路連線。'); setStep('select')
    }
  }

  // ── AI photo scan → returns candidates ───────────────────────────────────
  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setStep('analyzing'); setError('')

    console.log('[ZenPlate AI] Upload received:', file.name, file.type, `${(file.size / 1024).toFixed(1)}KB`)

    try {
      // Always compress to JPEG ≤ 3 MB — avoids Gemini 400 errors from large iPhone photos
      const compressed = await compressImage(file)
      const base64 = compressed || await fileToBase64(file)
      const mimeType = 'image/jpeg'
      console.log('[ZenPlate AI] Final base64 size:', Math.round(base64.length * 0.75 / 1024), 'KB')
      const imgPart  = { inlineData: { data: base64.split(',')[1], mimeType } }
      const timeout  = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT')), ms))])

      console.log('[ZenPlate AI] Starting recognition, models:', GEMINI_FALLBACK_MODELS)

      let resp = null, lastErr = null
      for (const model of GEMINI_FALLBACK_MODELS) {
        try {
          console.log('[ZenPlate AI] Trying model:', model)
          resp = await timeout(genAI.getGenerativeModel({ model }).generateContent([imgPart, VISION_PROMPT]), 30000)
          console.log('[ZenPlate AI] Success with model:', model)
          break
        } catch (err) {
          lastErr = err
          console.warn('[ZenPlate AI] Model failed:', model, err.message)
          const s = err?.message?.match(/\[(\d+)\s/)?.[1]
          if (['503','429','404'].includes(s) || err.message === 'TIMEOUT') continue
          throw err
        }
      }
      if (!resp) throw new Error(lastErr?.message === 'TIMEOUT' ? 'TIMEOUT' : lastErr?.message)

      const text  = resp.response.text().trim()
      console.log('[ZenPlate AI] ── RAW GEMINI RESPONSE ──────────────────────')
      console.log(text)
      console.log('[ZenPlate AI] ─────────────────────────────────────────────')
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('FORMAT_ERROR')

      let parsed
      try {
        parsed = JSON.parse(match[0])
      } catch (jsonErr) {
        console.error('[ZenPlate AI] JSON.parse failed:', jsonErr.message)
        console.error('[ZenPlate AI] Attempted to parse:', match[0].slice(0, 500))
        throw new Error('FORMAT_ERROR')
      }
      const rawCands = (parsed.candidates || []).filter(c => c.name)
      if (!rawCands.length) throw new Error('NO_CANDIDATES')

      // ── Debug: full AI output before any formatting ──────────────────────
      console.log('[ZenPlate AI] Raw candidates from model:',
        rawCands.map((c, i) => `[${i}] ${c.name} conf=${c.confidence} type=${c.food_type}`).join(' | '))
      console.log('[ZenPlate AI] Full parsed JSON:', JSON.stringify(rawCands))

      // ── Deduplicate (catches model returning same food with diff scores) ─
      const cands = deduplicateCandidates(rawCands)
      if (cands.length < rawCands.length) {
        console.warn('[ZenPlate AI] Duplicates removed:', rawCands.length, '→', cands.length,
          '— raw names:', rawCands.map(c => c.name).join(', '))
      }

      setCandidates(cands)
      setChosenIdx(0)

      // ── High confidence (≥ 85 %): skip selection, go straight to result ─
      if ((cands[0]?.confidence ?? 0) >= 85) {
        console.log('[ZenPlate AI] High confidence', cands[0].confidence, '% — auto-confirming:', cands[0].name)
        await confirmCandidate(0, cands[0])
        return
      }

      setStep('candidates')
    } catch (err) {
      console.error('[ZenPlate AI] Recognition error:', err)
      const code = err.message || 'UNKNOWN'
      const msg =
        code === 'TIMEOUT'       ? 'AI 回應逾時，請稍後再試或改用手動搜尋。' :
        code === 'FORMAT_ERROR'  ? 'AI 回傳格式異常，請重試。' :
        code === 'NO_CANDIDATES' ? 'AI 無法辨識這張圖片，請換一張或改用手動搜尋。' :
        code.includes('503')     ? 'AI 服務暫時忙碌（503），請稍後再試。' :
        code.includes('429')     ? 'AI 請求過多（429），請等 30 秒再試。' :
        code.includes('400')     ? '圖片格式或大小有問題（400），請換一張照片。' :
        `AI 辨識失敗：${code.slice(0, 80)}`
      setError(msg); setStep('select')
    }
  }

  // ── User confirms a candidate → route by food_type ───────────────────────
  // candOverride: pass candidate directly when calling before state commits (e.g. auto-confirm)
  const confirmCandidate = async (idx, candOverride = null) => {
    const cand = candOverride ?? candidates[idx]
    setMealName(cand.name)
    setConfirmedCandidate(cand)

    const ft = cand.food_type || (cand.packaged ? 'packaged_food' : 'general_meal')
    console.log('[SCAN] confirmCandidate:', cand.name, '— food_type:', ft, '— brand:', cand.brand, '— confidence:', cand.confidence)

    // ── Packaged food debug trace (runs for every scan) ───────────────────
    ;(() => {
      console.group('[PKG DEBUG] Packaged food pipeline trace')
      console.log('1. food_type returned by Gemini:', cand.food_type, '→ resolved ft:', ft)
      console.log('2. packaged flag:', cand.packaged)
      console.log('3. brand from Gemini:', JSON.stringify(cand.brand))
      console.log('4. name from Gemini:', JSON.stringify(cand.name))
      console.log('5. components[0].name:', JSON.stringify(cand.components?.[0]?.name))
      console.log('6. OCR clues (raw):', JSON.stringify(cand.clues))
      console.log('7. container_clue:', JSON.stringify(cand.container_clue))
      console.log('8. full candidate object:', JSON.stringify(cand, null, 2))

      // Always attempt DB lookup regardless of food_type — log every score
      const ocrFragments  = cand.clues || []
      const productQuery  = cand.components?.[0]?.name || cand.name || ''
      const brandQuery    = cand.brand || ''
      console.log('9. DB query → brand:', JSON.stringify(brandQuery), '  product:', JSON.stringify(productQuery), '  ocrFragments:', JSON.stringify(ocrFragments))

      // Show ALL DB item scores (sorted desc) so we can see why something isn't matching
      const allScores = debugScoreAll(brandQuery, productQuery, ocrFragments)
      const relevant  = allScores.filter(r => r.score > 0.15)
      console.log('10. Full DB scores (score > 0.15):')
      if (relevant.length === 0) {
        console.log('    → NOTHING scored above 0.15 — OCR may be blank or misidentified')
      } else {
        relevant.slice(0, 12).forEach(r => {
          const verdict = r.score >= 0.82 ? '✅ auto'
            : r.score >= 0.65 ? '🟡 picker(strict)'
            : r.score >= 0.42 ? '🟡 picker'
            : '❌ no match'
          console.log(`    ${verdict}  score=${r.score}  →  ${r.label}`)
        })
      }
      console.log('    (full table:)')
      console.table(allScores.slice(0, 20))

      const willEnterPackagedBlock = ft === 'packaged_food' || !!cand.packaged
      if (!willEnterPackagedBlock) {
        console.warn('11. ⚠️  food_type is "' + ft + '" and packaged=false — packaged block would be SKIPPED without fallback')
      } else {
        console.log('11. food_type / packaged flag → packaged block will run ✓')
      }
      console.groupEnd()
    })()

    // ── chain_restaurant: FamilyMart, McDonald's, or Subway ───────────────
    if (ft === 'chain_restaurant') {
      // FamilyMart (async API lookup)
      if (isFamilyMartContext(cand.brand || '') || isFamilyMartContext(cand.name || '')) {
        setStep('analyzing')
        const results = await searchFamilyMart(cand.name || '')
        if (results.length > 0) {
          setFamilyMatches(results)
          setFamilySelected(results[0])
          // Single match → auto-fetch nutrition and jump to result
          if (results.length === 1) {
            const nut = await getFamilyMartNutrition(results[0].CMNO)
            if (nut) {
              setComponents([buildFamilyComp(nut)])
              setMealName(nut.name)
              setStep('result')
              return
            }
          }
          setStep('family')
          return
        }
        // No match: fall through to general_meal pipeline
      }

      // McDonald's
      const mcdCtx = isMcdonaldsContext(cand.brand || '') || isMcdonaldsContext(cand.name || '')
      if (mcdCtx) {
        const mcdMatches = (cand.components || [{ name: cand.name }])
          .map(c => matchMcdonaldsItem(c.name))
          .filter(Boolean)
        if (mcdMatches.length > 0) {
          setComponents(mcdMatches.map(item => ({
            name: item.name, aiName: item.name,
            grams: 1, baseGrams: 1, portionMult: 1,
            portionLevel: 'standard', correctionDir: null,
            calEst: item.cal, source: 'mcd', mcdItem: item,
            fdaItem: null, nycuDish: null, portionItem: null,
            portionConf: 90, portionReason: '',
          })))
          setStep('result')
          return
        }
      }

      // Subway
      if (isSubwayContext(cand)) {
        const matches = matchSubwayItems(cand.name, 3)
        setSubwayMatches(matches)
        setSubwayConfig({ ...DEFAULT_SUBWAY, sandwichId: matches[0]?.item_id ?? null })
        setStep('subway')
        return
      }
        // NYCU campus restaurants
      if (isNycuContext(cand.brand || '') || isNycuContext(cand.name || '')) {
        console.log('[SCAN] NYCU context detected, searching DB for:', cand.name)
        const nycuResults = searchNycuDb(cand.name, '', 5)
        console.log('[SCAN] NYCU search results:', nycuResults.map(r => `${r.dish.dishZh}(${r.score})`))
        if (nycuResults.length > 0 && nycuResults[0].score >= 50) {
          setComponents([buildNycuComp(nycuResults[0])])
          setMealName(nycuResults[0].dish.dishZh)
          setStep('result')
          return
        }
        // Low-score match: fall through to general_meal but components may still enrich via enrichComp
      }

      // 7-Eleven
      if (is7ElevenContext(cand.brand || '') || is7ElevenContext(cand.name || '')) {
        console.log('[SCAN] 7-Eleven context detected, searching DB for:', cand.name)
        const sevenResults = search7Eleven(cand.name, 3)
        console.log('[SCAN] 7-Eleven search results:', sevenResults.map(i => i.name))
        if (sevenResults.length > 0) {
          setComponents([build7ElevenComp(sevenResults[0])])
          setMealName(sevenResults[0].name)
          setStep('result')
          return
        }
        // Not a coffee item → fall through to general_meal pipeline
      }

        // Unknown chain → fall through to general_meal pipeline
    }

    // ── Bubble tea: dedicated OCR-first pipeline ──────────────────────────
    if (isBubbleTea(cand)) {
      console.log('[SCAN] Bubble tea detected — launching boba pipeline for:', cand.name)
      const meta = parseBobaMeta(cand)
      console.log('[SCAN] Boba meta:', meta)
      setBobaMeta(meta)
      setBobaOrder({
        brandKey:    meta.brandKey,
        drinkKey:    meta.drinkKey,
        cat:         meta.cat,
        displayBrand: meta.displayBrand,
        displayDrink: meta.displayDrink,
        size:        meta.size,
        sugarKey:    null,   // ALWAYS null — user must confirm
        iceKey:      null,
        toppings:    [...meta.toppings],
      })
      setStep('boba')
      return
    }

    // ── packaged_food: fuzzy DB lookup (runs for packaged_food AND general_meal fallback)
    // Reason: Gemini frequently returns food_type:'general_meal' even for packaged items.
    // We always try the DB; if there's a confident match we use it regardless of food_type.
    {
      const isExplicitPackaged = ft === 'packaged_food' || !!cand.packaged
      const ocrFragments = cand.clues || []
      const productQuery = cand.components?.[0]?.name || cand.name || ''
      const pkgCandidates = lookupPackagedFoodCandidates(
        cand.brand || '', productQuery, ocrFragments, 3
      )
      console.log('[SCAN] packaged lookup (ft=' + ft + '):', productQuery,
        '→', pkgCandidates.length > 0
          ? pkgCandidates.map(c => `${c.item.brand} ${c.item.name}(${c.score.toFixed(2)})`).join(', ')
          : 'no candidates'
      )

      if (pkgCandidates.length > 0) {
        const top = pkgCandidates[0]
        // For general_meal fallback, require higher confidence to avoid false positives
        const autoThreshold   = isExplicitPackaged ? 0.82 : 0.88
        const pickerThreshold = isExplicitPackaged ? 0.42 : 0.65

        if (top.score >= autoThreshold) {
          console.log('[SCAN] packaged auto-confirm:', top.item.brand, top.item.name, 'score:', top.score.toFixed(3))
          setComponents([buildPackagedComp(top.item, cand)])
          setMealName(`${top.item.brand} ${top.item.name}`)
          setStep('result')
          return
        }
        if (top.score >= pickerThreshold) {
          console.log('[SCAN] packaged show picker, top score:', top.score.toFixed(3))
          setPackagedCandidates(pkgCandidates)
          setStep('packaged_pick')
          return
        }
        console.log('[SCAN] packaged: best score', top.score.toFixed(3), '< threshold (', pickerThreshold, ') — falling through to enrichComp')
      } else {
        console.log('[SCAN] packaged: no DB candidates — falling through to enrichComp')
      }

      // Only bail out here if Gemini explicitly said packaged_food
      // (for general_meal we continue to enrichComp below)
      if (isExplicitPackaged && pkgCandidates.length === 0) {
        // No match at all for a confirmed packaged item — still proceed to enrichComp
      }
    }

    // ── general_meal (or fallback): component breakdown + enrichComp ──────
    const aiComps = cand.components?.length
      ? cand.components
      : [{ name: cand.name, grams: 200, portion_confidence: 50, portion_reason: '', hint: '1份' }]

    console.log('[SCAN] general_meal enriching', aiComps.length, 'components:', aiComps.map(c => c.name))
    setComponents(aiComps.map(ai => enrichComp(ai, dbReady, portionAdjustments)))
    setStep('result')
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    let payload

    if (step === 'barcode' && barcodeResult) {
      payload = {
        user_id: session.user.id, name: mealName, meal_type: MEAL_TYPE_V[mealType],
        calories: barcodeResult.calories, protein_g: barcodeResult.protein_g,
        carbs_g: barcodeResult.carbs_g, fat_g: barcodeResult.fat_g,
        fiber_g: barcodeResult.fiber_g, data_source: 'OpenFoodFacts',
      }
    } else {
      const total   = sumComps(components)

      // ── Calorie sanity validation ────────────────────────────────────────
      const COFFEE_NAMES = /咖啡|coffee|latte|americano|cappuccino|mocha|摩卡|拿鐵|美式/i
      for (const comp of components) {
        if (COFFEE_NAMES.test(comp.name) || COFFEE_NAMES.test(comp.aiName || '')) {
          const compNut = calcCompNut(comp)
          if (compNut.calories > 500) {
            console.warn('[SCAN] sanity: coffee calorie spike', comp.name, compNut.calories, 'kcal — source:', comp.source)
            setError(`⚠️ ${comp.name} 熱量異常（${compNut.calories} kcal），請調整份量後再儲存`)
            setSaving(false)
            return
          }
        }
      }
      if (total.calories > 2500) {
        console.warn('[SCAN] sanity: total calories very high:', total.calories)
        setError(`⚠️ 總熱量 ${total.calories} kcal 看起來偏高，請確認份量是否正確`)
        setSaving(false)
        return
      }

      console.log('[SCAN] handleSave — total:', total, '— sources:', components.map(c => `${c.name}(${c.source}/${c.grams}g)`))

      const sources = [...new Set(components.map(c => SRC_LABEL[c.source]))]
      const srcStr  = sources.length === 1
        ? (sources[0] === 'FDA'        ? 'Taiwan FDA 2025'
         : sources[0] === '交大'       ? 'NYCU 交大官方資料'
         : sources[0] === '7-Eleven官方' ? '7-Eleven Taiwan 官方'
         : sources[0])
        : sources.join(' + ')
      payload = {
        user_id: session.user.id, name: mealName, meal_type: MEAL_TYPE_V[mealType],
        calories:  total.calories  ?? 0,
        protein_g: total.protein   ?? null,
        carbs_g:   total.carbs     ?? null,
        fat_g:     total.fat       ?? null,
        fiber_g:   total.fiber     ?? null,
        data_source: srcStr,
      }
    }

    const { data: saved, error: dbErr } = await supabase.from('meals').insert(payload).select('id').single()
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    // Persist any portion corrections the user made (non-blocking)
    savePortionCorrections(supabase, session.user.id, saved?.id, MEAL_TYPE_V[mealType], components).catch(() => {})
    onSaved(calcPlateScore(payload))
  }

  // ── Subway save ───────────────────────────────────────────────────────────
  const handleSubwaySave = async () => {
    if (!subwayConfig.sandwichId) return
    setSaving(true)
    const nut      = calcSubwayMeal(subwayConfig)
    const sandwich = SUBWAY_DB.find(x => x.item_id === subwayConfig.sandwichId)
    const bread    = SUBWAY_DB.find(x => x.item_id === subwayConfig.breadId)
    const sauces   = subwayConfig.sauceIds.map(id => SUBWAY_DB.find(x => x.item_id === id)).filter(Boolean)

    const sizeLbl  = subwayConfig.sizeMult === 2 ? ' 12吋' : ' 6吋'
    const breadLbl = bread && bread.item_id !== 'bread_white' ? ` / ${bread.product_name_zh}` : ''
    const sauceLbl = sauces.length ? ` + ${sauces.map(s => s.product_name_zh).join('、')}` : ''
    const name     = `Subway ${sandwich.product_name_zh}${sizeLbl}${breadLbl}${sauceLbl}`

    const { error: dbErr } = await supabase.from('meals').insert({
      user_id:   session.user.id,
      name,
      meal_type: MEAL_TYPE_V[mealType],
      calories:  nut.calories,
      protein_g: nut.protein_g,
      carbs_g:   nut.carbs_g,
      fat_g:     nut.fat_g,
      fiber_g:   null,
      data_source: 'Subway Taiwan 官方',
    })
    setSaving(false)
    if (dbErr) setError(dbErr.message)
    else onSaved(calcPlateScore({ calories: nut.calories, protein_g: nut.protein_g, carbs_g: nut.carbs_g, fat_g: nut.fat_g, fiber_g: null }))
  }

  // ── FamilyMart confirm selection → fetch nutrition + go to result ────────
  const handleFamilyConfirm = async () => {
    if (!familySelected) return
    setStep('analyzing')
    const nut = await getFamilyMartNutrition(familySelected.CMNO)
    if (!nut) {
      setError('無法取得全家營養資料，請重試')
      setStep('family')
      return
    }
    setComponents([buildFamilyComp(nut)])
    setMealName(nut.name)
    setStep('result')
  }

  const fileToBase64 = f => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f)
  })

  // Compress image before sending to Gemini — iPhone photos can be 10-20 MB which causes API errors
  const compressImage = (file, maxSizeKB = 3000, maxDim = 1280) => new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, maxDim / Math.max(w, h))
      const cw = Math.round(w * scale), ch = Math.round(h * scale)
      const canvas = document.createElement('canvas')
      canvas.width = cw; canvas.height = ch
      canvas.getContext('2d').drawImage(img, 0, 0, cw, ch)
      // Try quality 0.85 first, drop to 0.70 if still too large
      const tryQuality = (q) => {
        const data = canvas.toDataURL('image/jpeg', q)
        const kb = Math.round(data.length * 0.75 / 1024)
        console.log(`[ZenPlate AI] Compressed: ${cw}×${ch} q=${q} → ${kb}KB`)
        if (kb > maxSizeKB && q > 0.5) return tryQuality(+(q - 0.15).toFixed(2))
        return data
      }
      resolve(tryQuality(0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })

  const reset = () => {
    setStep('select'); setError(''); setCandidates([]); setChosenIdx(0)
    setComponents([]); setBarcodeResult(null); setMealName('')
    setSubwayConfig(DEFAULT_SUBWAY); setSubwayMatches([])
    setFamilyMatches([]); setFamilySelected(null)
    setConfirmedCandidate(null)
    setBobaMeta(null); setBobaOrder(null)
    setPackagedCandidates([])
  }

  // ── Confirm boba order → build component → go to result ──────────────────
  const handleBobaConfirm = () => {
    if (!bobaOrder || !bobaOrder.sugarKey || !bobaOrder.size) return
    const comp = buildBobaComponent({ ...bobaOrder })
    setMealName(comp.name)
    setComponents([comp])
    setStep('result')
  }

  // Derived totals for result step
  const total         = sumComps(components)
  const hasAiEstimate = components.some(c => c.source === 'ai')
  const plateScore    = total.calories > 0 ? calcPlateScore({
    calories: total.calories, protein_g: total.protein ?? 0,
    fat_g: total.fat ?? 0, fiber_g: total.fiber ?? 0, carbs_g: total.carbs ?? 0
  }) : null
  const plateInfo      = plateScore != null ? scoreInfo(plateScore) : null
  const breakdown      = plateScore != null ? getScoreBreakdown({
    calories: total.calories, protein_g: total.protein ?? 0,
    fat_g: total.fat ?? 0, fiber_g: total.fiber ?? 0, carbs_g: total.carbs ?? 0
  }) : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-content">

          {/* ── Select mode ── */}
          {step === 'select' && !scanning && (
            <>
              <h3 className="modal-title">新增餐點 📷</h3>
              {!dbReady && <div className="fda-loading">⏳ 載入食品資料庫...</div>}
              {error && <p className="login-error" style={{ marginBottom: 12 }}>{error}</p>}

              <div className="scan-options">
                <button className="scan-option-btn" onClick={startBarcodeScan}>
                  <span className="scan-option-icon">📦</span>
                  <span className="scan-option-label">掃條碼</span>
                  <span className="scan-option-sub">包裝食品</span>
                </button>
                <button className="scan-option-btn" onClick={() => fileInputRef.current?.click()}>
                  <span className="scan-option-icon">📷</span>
                  <span className="scan-option-label">拍照辨識</span>
                  <span className="scan-option-sub">AI 多候選分析</span>
                </button>
                <button className="scan-option-btn scan-option-gallery" onClick={() => galleryRef.current?.click()}>
                  <span className="scan-option-icon">🖼️</span>
                  <span className="scan-option-label">從相簿上傳</span>
                  <span className="scan-option-sub">選擇已有的照片</span>
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                style={{ display:'none' }} onChange={handlePhotoCapture}/>
              <input ref={galleryRef} type="file" accept="image/*"
                style={{ display:'none' }} onChange={handlePhotoCapture}/>

              <div className="fda-manual-section">
                <p className="fda-manual-label">🔍 直接搜尋 FDA 資料庫</p>
                {dbReady
                  ? <FdaSearch onSelect={item => {
                      setMealName(item.n)
                      setComponents([enrichComp({ name: item.n, grams: 150, cal_est: 0 }, true)])
                      setStep('result')
                    }}/>
                  : <p style={{ fontSize:12, color:'#999' }}>資料庫載入中...</p>
                }
              </div>

              <button className="signout-btn" style={{ marginTop: 8 }} onClick={onClose}>取消</button>
            </>
          )}

          {/* ── Barcode scanning ── */}
          {scanning && (
            <>
              <h3 className="modal-title">對準條碼 📦</h3>
              <div className="scan-video-wrap">
                <video ref={videoRef} style={{ width:'100%', display:'block' }}/>
                <div className="scan-crosshair"/>
              </div>
              <p className="scan-hint">自動掃描中...</p>
              <button className="signout-btn" style={{ marginTop:12 }}
                onClick={() => { codeRef.current?.reset(); setScanning(false) }}>取消</button>
            </>
          )}

          {/* ── Analyzing ── */}
          {step === 'analyzing' && (
            <>
              <h3 className="modal-title">AI 分析中... 🤖</h3>
              <div className="scan-analyzing">
                <div className="scan-spinner">🔍</div>
                <p>辨識食物 · 比對多個資料庫...</p>
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>約需 5–15 秒</p>
              </div>
            </>
          )}

          {/* ── Candidates ── */}
          {step === 'candidates' && (
            <>
              <h3 className="modal-title">這是什麼食物？</h3>
              <p className="candidates-subtitle">
                {`AI 不太確定（${confLabel(candidates[0]?.confidence, 0)}），請選最接近的選項：`}
              </p>

              <div className="candidates-list">
                {candidates.map((c, i) => (
                  <button key={i}
                    className={`candidate-card ${chosenIdx === i ? 'selected' : ''}`}
                    onClick={() => setChosenIdx(i)}
                  >
                    <div className="candidate-card-top">
                      <span className="candidate-name">{c.name}</span>
                      <span className="candidate-pct">{confLabel(c.confidence, i)}</span>
                    </div>
                    <div className="candidate-conf-bar">
                      <div className="candidate-conf-fill" style={{ width: `${c.confidence ?? 30}%` }}/>
                    </div>
                    <div className="candidate-meta">
                      {c.food_type && (
                        <span className="candidate-food-type">{FOOD_TYPE_LABEL[c.food_type] || c.food_type}</span>
                      )}
                      {c.container_clue && (
                        <span className="candidate-container">🫙 {c.container_clue}</span>
                      )}
                      {c.clues?.slice(0, 1).map((cl, j) => (
                        <span key={j} className="candidate-clue">{cl}</span>
                      ))}
                      <span className="candidate-items">{c.components?.length || 1} 個品項</span>
                    </div>
                  </button>
                ))}
              </div>

              <button className="submit-btn" onClick={() => confirmCandidate(chosenIdx)}>
                確認「{candidates[chosenIdx]?.name}」→
              </button>
              {/* Manual hand-shaken drink override */}
              <button className="boba-manual-btn" onClick={() => {
                const cand = candidates[chosenIdx] || candidates[0]
                const meta = parseBobaMeta(cand || { name: '手搖飲料', confidence: 30 })
                setBobaMeta(meta)
                setBobaOrder({
                  brandKey: meta.brandKey, drinkKey: meta.drinkKey,
                  cat: meta.cat, displayBrand: meta.displayBrand,
                  displayDrink: meta.displayDrink, size: meta.size,
                  sugarKey: null, iceKey: null, toppings: [...meta.toppings],
                })
                setStep('boba')
              }}>
                🧋 這是手搖飲料
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新拍照</button>
            </>
          )}

          {/* ── Packaged food candidate picker ── */}
          {step === 'packaged_pick' && (
            <>
              <h3 className="modal-title">是哪個商品？📦</h3>
              <p className="pkg-pick-subtitle">找到幾個可能相符的包裝食品，請選一個：</p>

              <div className="pkg-pick-list">
                {packagedCandidates.map(({ item, score }, i) => {
                  const calPer = Math.round(item.cal100 * item.per / 100)
                  const conf = score >= 0.75 ? '非常可能' : score >= 0.55 ? '可能' : '也許'
                  const confColor = score >= 0.75 ? '#2BB5A0' : score >= 0.55 ? '#FF9800' : '#9E9E9E'
                  return (
                    <button key={item.id} className="pkg-pick-card"
                      onClick={() => {
                        setComponents([buildPackagedComp(item, confirmedCandidate)])
                        setMealName(`${item.brand} ${item.name}`)
                        setStep('result')
                      }}
                    >
                      <div className="pkg-pick-card-top">
                        <span className="pkg-pick-brand">{item.brand}</span>
                        <span className="pkg-pick-conf" style={{ color: confColor }}>{conf}</span>
                      </div>
                      <p className="pkg-pick-name">{item.name}</p>
                      <div className="pkg-pick-meta">
                        <span>每份 {item.per}g</span>
                        <span className="pkg-pick-dot">·</span>
                        <span>{calPer} kcal/份</span>
                        <span className="pkg-pick-dot">·</span>
                        <span>蛋白 {(item.pro100 * item.per / 100).toFixed(1)}g</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button className="pkg-pick-none-btn"
                onClick={() => {
                  // Fall through to general_meal enrichment
                  if (confirmedCandidate) {
                    const aiComps = confirmedCandidate.components?.length
                      ? confirmedCandidate.components
                      : [{ name: confirmedCandidate.name, grams: 200, portion_confidence: 50, portion_reason: '' }]
                    setComponents(aiComps.map(ai => enrichComp(ai, dbReady, portionAdjustments)))
                    setMealName(confirmedCandidate.name)
                  }
                  setStep('result')
                }}
              >
                都不是，用 AI 估算
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新拍照</button>
            </>
          )}

          {/* ── Result / Edit ── */}
          {step === 'result' && (
            <>
              <h3 className="modal-title">你的餐點 🍽️</h3>

              {/* 1. Plate Score — shown first so user sees the "why" immediately */}
              {plateScore != null && (
                <div className="plate-score-card">
                  <div className="plate-score-header">
                    <span className="plate-score-label">Plate Score</span>
                    <span className="plate-score-badge" style={{ background: plateInfo.bg, color: plateInfo.color }}>
                      {plateScore} · {plateInfo.label}
                    </span>
                  </div>
                  <div className="plate-score-reasons">
                    {breakdown.good.map((r, i) => (
                      <span key={i} className="plate-reason good">✓ {r}</span>
                    ))}
                    {breakdown.bad.map((r, i) => (
                      <span key={i} className="plate-reason bad">✗ {r}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 2a. High-confidence banner */}
              {(confirmedCandidate?.confidence ?? 0) >= 85 && (
                <div className="confirm-banner confirm-banner--ok">
                  ✅ AI 高度確認（{confirmedCandidate.confidence}%）— 如果辨識錯誤請重新拍照
                </div>
              )}

              {/* 2b. Needs-confirmation banner */}
              {confirmedCandidate?.needs_confirmation && (
                <div className="confirm-banner">
                  ⚠️ AI 對份量不太確定，請確認每項食材的份量是否正確
                </div>
              )}

              {/* 3. Meal name */}
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>餐點名稱</label>
                <input className="form-input" value={mealName}
                  onChange={e => setMealName(e.target.value)}/>
              </div>

              {/* 4. Portion prompt */}
              <p className="confirm-portion-prompt">
                {hasPersonalization(portionAdjustments)
                  ? '✨ 份量已根據你的習慣調整，確認看看對嗎？'
                  : '這份量看起來對嗎？'}
              </p>

              {/* 5. Component list with level UX */}
              <div className="comp-list">
                {components.map((comp, i) => (
                  <ComponentRow key={i} comp={comp} dbReady={dbReady}
                    onChange={updated => setComponents(cs => cs.map((c, j) => j === i ? updated : c))}
                    onRemove={() => setComponents(cs => cs.filter((_, j) => j !== i))}
                  />
                ))}
                <div className="comp-add-row">
                  <p className="fda-add-label">＋ 新增食材</p>
                  <FdaSearch key={components.length}
                    onSelect={item => setComponents(prev => [
                      ...prev, enrichComp({ name: item.n, grams: 100, cal_est: 0 }, true)
                    ])}/>
                </div>
              </div>

              {/* 6. Total nutrition summary */}
              <div className="result-totals">
                <div className="result-total-row">
                  {[
                    [total.calories ?? 0,   'kcal'],
                    [total.protein  ?? '?', '蛋白質 g'],
                    [total.carbs    ?? '?', '碳水 g'],
                    [total.fat      ?? '?', '脂肪 g'],
                  ].map(([val, lbl]) => (
                    <div key={lbl} className="result-total-item">
                      <span className="result-total-val">{val}</span>
                      <span className="result-total-lbl">{lbl}</span>
                    </div>
                  ))}
                </div>
                {total.fiber != null && total.fiber > 0 && (
                  <div className="result-fiber-row">
                    <span className="result-fiber-label">膳食纖維</span>
                    <span className="result-fiber-val">{total.fiber} g</span>
                  </div>
                )}
                {hasAiEstimate && (
                  <p className="result-total-warn">⚠ 含 AI 估算，實際數值可能略有差異</p>
                )}
                {total.fiber == null && (
                  <p className="result-total-warn" style={{ color: '#aaa' }}>
                    膳食纖維：此食物來源暫無纖維資料（僅 FDA 資料庫含纖維數據）
                  </p>
                )}
              </div>

              {/* 7. Meal type */}
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>餐別</label>
                <div className="meal-type-btns">
                  {MEAL_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                      onClick={() => setMealType(t)}>{t}</button>
                  ))}
                </div>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button className="submit-btn" onClick={handleSave}
                disabled={saving || components.length === 0}>
                {saving ? '儲存中...' : `✓ 記錄餐點（${total.calories ?? 0} kcal）`}
              </button>
              <button className="boba-manual-btn" onClick={() => {
                const cand = confirmedCandidate || { name: '手搖飲料', confidence: 30 }
                const meta = parseBobaMeta(cand)
                setBobaMeta(meta)
                setBobaOrder({
                  brandKey: meta.brandKey, drinkKey: meta.drinkKey,
                  cat: meta.cat, displayBrand: meta.displayBrand,
                  displayDrink: meta.displayDrink, size: meta.size,
                  sugarKey: null, iceKey: null, toppings: [...meta.toppings],
                })
                setStep('boba')
              }}>
                🧋 這其實是手搖飲料
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

          {/* ── Subway customizer ── */}
          {step === 'subway' && (
            <>
              {/* Header */}
              <div className="subway-header">
                <span className="subway-logo-badge">🥖 Subway Taiwan</span>
                <span className="subway-source-tag">官方公開營養數據</span>
              </div>

              {/* Sandwich picker */}
              <p className="subway-section-label">選擇品項</p>

              {/* Top matches highlighted */}
              {subwayMatches.length > 0 && (
                <div className="subway-matches-row">
                  {subwayMatches.map(item => (
                    <button key={item.item_id}
                      className={`subway-match-card ${subwayConfig.sandwichId === item.item_id ? 'active' : ''}`}
                      onClick={() => setSubwayConfig(c => ({ ...c, sandwichId: item.item_id }))}>
                      <span className="subway-match-name">{item.product_name_zh}</span>
                      <span className="subway-match-cal">{item.calories} kcal</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Full scrollable list */}
              <div className="subway-all-label">全部品項</div>
              <div className="subway-item-scroll">
                {subwayByCategory('6inch').map(item => (
                  <button key={item.item_id}
                    className={`subway-item-row ${subwayConfig.sandwichId === item.item_id ? 'active' : ''}`}
                    onClick={() => setSubwayConfig(c => ({ ...c, sandwichId: item.item_id }))}>
                    <span className="subway-item-zh">{item.product_name_zh}</span>
                    <span className="subway-item-en">{item.product_name_en}</span>
                    <span className="subway-item-cal">{item.calories}</span>
                  </button>
                ))}
              </div>

              {/* Bread */}
              <p className="subway-section-label">麵包</p>
              <div className="subway-chip-row">
                {subwayByCategory('bread').map(b => (
                  <button key={b.item_id}
                    className={`subway-chip ${subwayConfig.breadId === b.item_id ? 'active' : ''}`}
                    onClick={() => setSubwayConfig(c => ({ ...c, breadId: b.item_id }))}>
                    {b.product_name_zh}
                  </button>
                ))}
              </div>

              {/* Sauce */}
              <p className="subway-section-label">醬料 <span className="subway-section-sub">（可複選）</span></p>
              <div className="subway-chip-row">
                {subwayByCategory('sauce').map(s => {
                  const on = subwayConfig.sauceIds.includes(s.item_id)
                  return (
                    <button key={s.item_id}
                      className={`subway-chip ${on ? 'active' : ''}`}
                      onClick={() => setSubwayConfig(c => ({
                        ...c,
                        sauceIds: on
                          ? c.sauceIds.filter(id => id !== s.item_id)
                          : [...c.sauceIds, s.item_id],
                      }))}>
                      {s.product_name_zh}
                      {s.calories >= 50 && <span className="subway-chip-cal"> +{Math.round(s.calories)}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Size */}
              <p className="subway-section-label">尺寸</p>
              <div className="subway-chip-row">
                {[[1, '6 吋'], [2, '12 吋（長）']].map(([mult, label]) => (
                  <button key={mult}
                    className={`subway-chip ${subwayConfig.sizeMult === mult ? 'active' : ''}`}
                    onClick={() => setSubwayConfig(c => ({ ...c, sizeMult: mult }))}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Live nutrition preview */}
              {subwayConfig.sandwichId && (() => {
                const nut = calcSubwayMeal(subwayConfig)
                return nut && (
                  <div className="result-totals" style={{ marginTop: 14 }}>
                    <div className="result-total-row">
                      {[
                        [nut.calories,  'kcal'],
                        [nut.protein_g, '蛋白質 g'],
                        [nut.carbs_g,   '碳水 g'],
                        [nut.fat_g,     '脂肪 g'],
                      ].map(([val, lbl]) => (
                        <div key={lbl} className="result-total-item">
                          <span className="result-total-val">{val}</span>
                          <span className="result-total-lbl">{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Disclaimer */}
              <p className="subway-disclaimer">
                📋 依據 Subway Taiwan 官方公開數據。
                蔬菜熱量極低已計入。醬料若未加選，以無醬計算。
              </p>

              {/* Meal type */}
              <div className="form-group" style={{ marginTop: 10 }}>
                <label>餐別</label>
                <div className="meal-type-btns">
                  {MEAL_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                      onClick={() => setMealType(t)}>{t}</button>
                  ))}
                </div>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button className="submit-btn"
                disabled={!subwayConfig.sandwichId || saving}
                onClick={handleSubwaySave}>
                {saving ? '儲存中...' : (() => {
                  const nut = subwayConfig.sandwichId ? calcSubwayMeal(subwayConfig) : null
                  return `✓ 記錄 Subway（${nut?.calories ?? '—'} kcal）`
                })()}
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

          {/* ── FamilyMart product picker ── */}
          {step === 'family' && (
            <>
              <div className="subway-header">
                <span className="subway-logo-badge" style={{ background: '#009944' }}>🏪 全家 FamilyMart</span>
                <span className="subway-source-tag">官方公開營養數據</span>
              </div>

              <p className="subway-section-label">選擇商品</p>
              <div className="subway-item-scroll">
                {familyMatches.map(item => (
                  <button key={item.CMNO}
                    className={`subway-item-row ${familySelected?.CMNO === item.CMNO ? 'active' : ''}`}
                    onClick={() => setFamilySelected(item)}>
                    <span className="subway-item-zh">{item.PRODNAME}</span>
                    <span className="subway-item-en">{item.CATEGORY_NAME}</span>
                    {item.cal != null && <span className="subway-item-cal">{item.cal}</span>}
                  </button>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: 10 }}>
                <label>餐別</label>
                <div className="meal-type-btns">
                  {MEAL_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                      onClick={() => setMealType(t)}>{t}</button>
                  ))}
                </div>
              </div>

              {error && <p className="login-error">{error}</p>}

              <button className="submit-btn"
                disabled={!familySelected || saving}
                onClick={handleFamilyConfirm}>
                確認「{familySelected?.PRODNAME || ''}」→
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

          {/* ── Hand-shaken drink confirm ── */}
          {step === 'boba' && bobaOrder && (() => {
            const previewNut = calcDrinkTotal({ ...bobaOrder, sugarKey: bobaOrder.sugarKey || 'half' })
            const allBrands  = Object.keys(BOBA_BRANDS)
            const allDrinks  = bobaOrder.brandKey
              ? Object.keys(BOBA_BRANDS[bobaOrder.brandKey]?.drinks || {})
              : []
            const lowConf   = (bobaMeta?.confidence ?? 50) < 55
            const sugarReady = !!bobaOrder.sugarKey
            const sizeReady  = !!bobaOrder.size

            return (
              <>
                {/* Header */}
                <div className="boba-header">
                  <span className="boba-logo">🧋</span>
                  <div className="boba-header-text">
                    <span className="boba-title">手搖飲料</span>
                    {(bobaMeta?.displayBrand || bobaMeta?.displayDrink) && (
                      <span className="boba-brand-detected">
                        {[bobaMeta.displayBrand, bobaMeta.displayDrink].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {bobaMeta?.ocrSnippets?.length > 0 && (
                      <span className="boba-ocr-hint">
                        🔍 OCR：{bobaMeta.ocrSnippets.slice(0, 3).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Low confidence banner */}
                {lowConf && (
                  <div className="boba-conf-warn">
                    🤔 不太確定，但這看起來是手搖飲料 — 請確認以下資訊
                  </div>
                )}

                {/* Drink category — shown when brand/drink unknown or low confidence */}
                {(!bobaOrder.drinkKey || lowConf) && (
                  <div className="boba-section">
                    <p className="boba-section-label">飲料類型</p>
                    <div className="boba-cat-grid">
                      {Object.entries(DRINK_CATEGORIES).map(([key, cat]) => (
                        <button key={key}
                          className={`boba-cat-btn ${bobaOrder.cat === key ? 'boba-chip-on' : ''}`}
                          onClick={() => setBobaOrder(o => ({
                            ...o,
                            cat: key,
                            displayDrink: o.drinkKey || cat.label_zh,
                          }))}>
                          <span className="boba-cat-emoji">{cat.emoji}</span>
                          <span className="boba-cat-label">{cat.label_zh}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brand selector */}
                <div className="boba-section">
                  <p className="boba-section-label">品牌 <span className="boba-section-sub">（選填）</span></p>
                  <div className="boba-chips boba-chips-scroll">
                    {allBrands.map(b => (
                      <button key={b}
                        className={`boba-chip ${bobaOrder.brandKey === b ? 'boba-chip-on' : ''}`}
                        onClick={() => setBobaOrder(o => ({
                          ...o,
                          brandKey:     b,
                          displayBrand: BOBA_BRANDS[b].display,
                          drinkKey:     null,
                        }))}>
                        {BOBA_BRANDS[b].display}
                      </button>
                    ))}
                    <button
                      className={`boba-chip ${!bobaOrder.brandKey ? 'boba-chip-on' : ''}`}
                      onClick={() => setBobaOrder(o => ({ ...o, brandKey: null, drinkKey: null, displayBrand: null }))}>
                      其他 / 不確定
                    </button>
                  </div>
                </div>

                {/* Drink selector — only if brand is known */}
                {bobaOrder.brandKey && allDrinks.length > 0 && (
                  <div className="boba-section">
                    <p className="boba-section-label">品項</p>
                    <div className="boba-chips boba-chips-scroll">
                      {allDrinks.map(d => (
                        <button key={d}
                          className={`boba-chip ${bobaOrder.drinkKey === d ? 'boba-chip-on' : ''}`}
                          onClick={() => setBobaOrder(o => ({ ...o, drinkKey: d, displayDrink: d }))}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cup size — all 4 options */}
                <div className="boba-section">
                  <p className="boba-section-label">
                    杯型{!sizeReady && <span className="boba-required"> *必填</span>}
                  </p>
                  <div className="boba-chips">
                    {DRINK_SIZES.map(({ key, label, ml }) => (
                      <button key={key}
                        className={`boba-chip ${bobaOrder.size === key ? 'boba-chip-on' : ''}`}
                        onClick={() => setBobaOrder(o => ({ ...o, size: key }))}>
                        {label}
                        <span className="boba-chip-sub"> {ml}ml</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sugar level — ALWAYS shown, ALWAYS required */}
                <div className="boba-section">
                  <p className="boba-section-label">
                    甜度{!sugarReady && <span className="boba-required"> *必填</span>}
                    {!sugarReady && <span className="boba-required-note">（圖片無法判斷，請手動選擇）</span>}
                  </p>
                  <div className="boba-chips">
                    {SUGAR_LEVELS.map(({ key, label }) => (
                      <button key={key}
                        className={`boba-chip ${bobaOrder.sugarKey === key ? 'boba-chip-on' : ''}`}
                        onClick={() => setBobaOrder(o => ({ ...o, sugarKey: key }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ice level — always shown */}
                <div className="boba-section">
                  <p className="boba-section-label">冰量</p>
                  <div className="boba-chips">
                    {ICE_LEVELS.map(({ key, label }) => (
                      <button key={key}
                        className={`boba-chip ${bobaOrder.iceKey === key ? 'boba-chip-on' : ''}`}
                        onClick={() => setBobaOrder(o => ({ ...o, iceKey: key }))}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toppings */}
                <div className="boba-section">
                  <p className="boba-section-label">加料 <span className="boba-section-sub">（可複選）</span></p>
                  <div className="boba-chips">
                    {Object.entries(BOBA_TOPPINGS).map(([t, info]) => {
                      const on = bobaOrder.toppings.includes(t)
                      return (
                        <button key={t}
                          className={`boba-chip ${on ? 'boba-chip-on' : ''}`}
                          onClick={() => setBobaOrder(o => ({
                            ...o,
                            toppings: on
                              ? o.toppings.filter(x => x !== t)
                              : [...o.toppings, t],
                          }))}>
                          {info.emoji} {t}
                          <span className="boba-chip-cal"> +{info.cal}</span>
                        </button>
                      )
                    })}
                    {bobaOrder.toppings.length > 0 && (
                      <button className="boba-chip boba-chip-clear"
                        onClick={() => setBobaOrder(o => ({ ...o, toppings: [] }))}>
                        ✕ 不加料
                      </button>
                    )}
                  </div>
                </div>

                {/* Live nutrition preview */}
                <div className="boba-nut-preview">
                  <div className="boba-nut-row">
                    {[
                      [previewNut.calories, 'kcal'],
                      [previewNut.protein,  '蛋白質 g'],
                      [previewNut.carbs,    '碳水 g'],
                      [previewNut.fat,      '脂肪 g'],
                    ].map(([val, lbl]) => (
                      <div key={lbl} className="boba-nut-item">
                        <span className="boba-nut-val">{val}</span>
                        <span className="boba-nut-lbl">{lbl}</span>
                      </div>
                    ))}
                  </div>
                  <p className="boba-nut-note">
                    {sugarReady
                      ? `✦ ${SUGAR_LEVELS.find(s => s.key === bobaOrder.sugarKey)?.label} · 手搖飲料庫估算`
                      : '✦ 以半糖預估 — 請選擇甜度以確認熱量'}
                  </p>
                </div>

                {/* Meal type */}
                <div className="form-group" style={{ marginTop: 10 }}>
                  <label>餐別</label>
                  <div className="meal-type-btns">
                    {MEAL_TYPES.map(t => (
                      <button key={t} type="button"
                        className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                        onClick={() => setMealType(t)}>{t}</button>
                    ))}
                  </div>
                </div>

                <button className="submit-btn"
                  disabled={!sugarReady || !sizeReady}
                  onClick={handleBobaConfirm}>
                  {!sugarReady ? '⚠ 請先選擇甜度'
                   : !sizeReady ? '⚠ 請先選擇杯型'
                   : `✓ 確認（${previewNut.calories} kcal）→`}
                </button>
                <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
              </>
            )
          })()}

          {/* ── Barcode result ── */}
          {step === 'barcode' && barcodeResult && (
            <>
              <h3 className="modal-title">確認餐點 ✅</h3>
              <div className="fda-badge fda-badge-warn">📦 OpenFoodFacts · 每 100g 數值</div>
              <div className="form-group">
                <label>餐點名稱</label>
                <input className="form-input" value={mealName}
                  onChange={e => setMealName(e.target.value)}/>
              </div>
              <div className="fda-totals">
                <div className="fda-total-row">
                  {[['calories','kcal'],['protein_g','蛋白質 g'],['carbs_g','碳水 g'],['fat_g','脂肪 g']].map(([k,lbl]) => (
                    <div key={k} className="fda-total-item">
                      <span className="fda-total-val">{barcodeResult[k]}</span>
                      <span className="fda-total-lbl">{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginTop:12 }}>
                <label>餐別</label>
                <div className="meal-type-btns">
                  {MEAL_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                      onClick={() => setMealType(t)}>{t}</button>
                  ))}
                </div>
              </div>
              {error && <p className="login-error">{error}</p>}
              <button className="submit-btn" onClick={handleSave} disabled={saving}>
                {saving ? '儲存中...' : '✓ 記錄餐點'}
              </button>
              <button className="signout-btn" style={{ marginTop:8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
