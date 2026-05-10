import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'
import { loadFdaDb, lookupByName, searchFda, calcNutrition, CATEGORY_EMOJI } from '../utils/fdaDb'
import { matchNycuDish } from '../utils/nycuDb'
import { lookupPackagedFood } from '../data/packagedFoods'
import { isSubwayContext, matchSubwayItems, calcSubwayMeal, SUBWAY_DB, subwayByCategory } from '../utils/subwayDb'
import { isMcdonaldsContext, matchMcdonaldsItem } from '../utils/mcdonaldsDb'
import { lookupComponent, compNutrition, COMPONENT_ID_LIST } from '../utils/portionDb'
import { calcPlateScore, scoreInfo, getScoreBreakdown } from '../utils/scoring'
import { loadPortionAdjustments, savePortionCorrections, hasPersonalization } from '../utils/portionLearning'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const MEAL_TYPES   = ['早餐', '午餐', '晚餐', '點心']
const MEAL_TYPE_V  = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '點心': 'snack' }
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest']

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
1. 永遠回傳 3 個 candidates，由高到低信心度排序
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
10. packaged_food → packaged:true，brand 填品牌名
11. 就算不確定也要給最佳猜測，不可回傳空 candidates
12. component name 欄位：優先用上方清單的英文 ID，找不到才用中文
13. 看到 Subway 店面/包裝/logo → food_type:"chain_restaurant"，brand 填 "Subway"，name 填菜單品項中文名稱
14. 看到 McDonald's/麥當勞 店面/包裝/logo → food_type:"chain_restaurant"，brand 填 "McDonald's"，name 填菜單品項中文名稱（如：大麥克、麥克鷄塊、薯條）
15. cal_est/pro_est/carb_est/fat_est：只在 name 為中文且完全找不到對應 component_id 時填入（該 grams 份量的總估計值，不是每100g）；有 component_id 匹配就填 null`

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
const SRC_LABEL = { fda: 'FDA', nycu: '交大', packaged: '包裝', ai: 'AI估算', subway: 'Subway官方', portion: '份量庫', mcd: '麥當勞官方' }
const SRC_COLOR = { fda: '#2BB5A0', nycu: '#4CAF50', packaged: '#FF9800', ai: '#9E9E9E', subway: '#00833D', portion: '#7C3AED', mcd: '#DA291C' }

// ── Default Subway config ─────────────────────────────────────────────────────
const DEFAULT_SUBWAY = { sandwichId: null, breadId: 'bread_white', sauceIds: [], sizeMult: 1 }

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

  // 1. NYCU campus DB
  const nycu = matchNycuDish(ai.name)
  if (nycu && nycu.score >= 70) {
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
    return {
      ...base,
      name: portionItem.name_zh, source: 'portion', portionItem,
      grams: best.g, baseGrams: rawAiG,
      portionLevel: best.level, portionMult: LEVEL_FACTORS[best.level],
      fdaItem: null, nycuDish: null,
    }
  }

  // 3. FDA DB
  if (dbReady) {
    const fda = lookupByName(ai.name) || (searchFda(ai.name, 1)[0] || null)
    if (fda) return { ...base, name: fda.n, source: 'fda', fdaItem: fda, nycuDish: null, portionItem: null }
  }

  // 4. AI estimate fallback
  return { ...base, name: ai.name, source: 'ai', fdaItem: null, nycuDish: null, portionItem: null }
}

// ── Nutrition for one component ───────────────────────────────────────────────
function calcCompNut(comp) {
  const m = comp.portionMult ?? 1
  if (comp.source === 'fda' && comp.fdaItem)
    return calcNutrition(comp.fdaItem, comp.grams)
  if (comp.source === 'portion' && comp.portionItem) {
    const nut = compNutrition(comp.portionItem, comp.grams)
    return { calories: nut.calories, protein: nut.protein, carbs: nut.carbs, fat: nut.fat, fiber: 0 }
  }
  if (comp.source === 'nycu' && comp.nycuDish) {
    const d = comp.nycuDish
    return {
      calories: Math.round((d.cal || 0) * m),
      protein:  +((d.pro  || 0) * m).toFixed(1),
      carbs:    +((d.carb || 0) * m).toFixed(1),
      fat:      +((d.fat  || 0) * m).toFixed(1),
      fiber: 0,
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
  if (comp.source === 'packaged' && comp.packagedItem) {
    const { item, servingG } = comp.packagedItem
    const g = (servingG || 100) * m
    return {
      calories: Math.round(item.cal100 * g / 100),
      protein:  +(item.pro100  * g / 100).toFixed(1),
      carbs:    +(item.carb100 * g / 100).toFixed(1),
      fat:      +(item.fat100  * g / 100).toFixed(1),
      fiber: 0,
    }
  }
  // AI estimate — use AI macro estimates when available
  return {
    calories: Math.round((comp.calEst  || 0) * m),
    protein:  comp.proEst  != null ? +(comp.proEst  * m).toFixed(1) : null,
    carbs:    comp.carbEst != null ? +(comp.carbEst * m).toFixed(1) : null,
    fat:      comp.fatEst  != null ? +(comp.fatEst  * m).toFixed(1) : null,
    fiber: 0,
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
  const nut          = calcCompNut(comp)
  const isMcdBased   = comp.source === 'mcd' && comp.mcdItem
  const portionLow   = (comp.portionConf ?? 55) < 55
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

      {/* McDonald's: item count +/- */}
      {isMcdBased ? (
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
      </div>

      {/* FDA override: power-user search (secondary) */}
      {comp.source !== 'fda' && dbReady && (
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
export default function ScanModal({ session, onClose, onSaved }) {
  const [step,      setStep]      = useState('select')  // select|analyzing|candidates|result|barcode
  const [error,     setError]     = useState('')
  const [mealType,  setMealType]  = useState('午餐')
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

    try {
      const base64  = await fileToBase64(file)
      const imgPart = { inlineData: { data: base64.split(',')[1], mimeType: file.type || 'image/jpeg' } }
      const timeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT')), ms))])

      let resp = null, lastErr = null
      for (const model of GEMINI_MODELS) {
        try {
          resp = await timeout(genAI.getGenerativeModel({ model }).generateContent([imgPart, VISION_PROMPT]), 30000)
          break
        } catch (err) {
          lastErr = err
          const s = err?.message?.match(/\[(\d+)\s/)?.[1]
          if (['503','429','404'].includes(s) || err.message === 'TIMEOUT') continue
          throw err
        }
      }
      if (!resp) throw new Error(lastErr?.message === 'TIMEOUT' ? 'AI 回應逾時，請重試' : lastErr?.message)

      const text  = resp.response.text().trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI 回傳格式錯誤，請重試')

      const parsed = JSON.parse(match[0])
      const cands  = (parsed.candidates || []).filter(c => c.name)
      if (!cands.length) throw new Error('AI 無法辨識，請重試或手動輸入')

      setCandidates(cands); setChosenIdx(0); setStep('candidates')
    } catch (err) {
      setError('辨識失敗：' + err.message); setStep('select')
    }
  }

  // ── User confirms a candidate → route by food_type ───────────────────────
  const confirmCandidate = (idx) => {
    const cand = candidates[idx]
    setMealName(cand.name)
    setConfirmedCandidate(cand)

    const ft = cand.food_type || (cand.packaged ? 'packaged_food' : 'general_meal')

    // ── chain_restaurant: McDonald's or Subway ────────────────────────────
    if (ft === 'chain_restaurant') {
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
      // Unknown chain → fall through to general_meal pipeline
    }

    // ── packaged_food: local packaged DB → fallback to enrichComp ─────────
    if (ft === 'packaged_food' || cand.packaged) {
      const pkg = lookupPackagedFood(cand.brand || '', cand.components?.[0]?.name || cand.name)
      if (pkg) {
        setComponents([{
          name: `${pkg.item.brand} ${pkg.item.name}`,
          aiName: cand.name, grams: pkg.item.per, baseGrams: pkg.item.per,
          portionMult: 1, portionLevel: 'standard', correctionDir: null,
          calEst: 0, hint: `${pkg.item.per}g/份`,
          portionReason: '', portionConf: 90,
          source: 'packaged', packagedItem: pkg, fdaItem: null, nycuDish: null,
        }])
        setStep('result')
        return
      }
    }

    // ── general_meal (or fallback): component breakdown + enrichComp ──────
    const aiComps = cand.components?.length
      ? cand.components
      : [{ name: cand.name, grams: 200, portion_confidence: 50, portion_reason: '', hint: '1份' }]

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
      const sources = [...new Set(components.map(c => SRC_LABEL[c.source]))]
      const srcStr  = sources.length === 1
        ? (sources[0] === 'FDA' ? 'Taiwan FDA 2025' : sources[0] === '交大' ? 'NYCU 交大官方資料' : sources[0])
        : sources.join(' + ')
      payload = {
        user_id: session.user.id, name: mealName, meal_type: MEAL_TYPE_V[mealType],
        calories:  total.calories  ?? 0,
        protein_g: total.protein   ?? null,
        carbs_g:   total.carbs     ?? null,
        fat_g:     total.fat       ?? null,
        fiber_g:   null,
        data_source: srcStr,
      }
    }

    const { data: saved, error: dbErr } = await supabase.from('meals').insert(payload).select('id').single()
    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    // Persist any portion corrections the user made (non-blocking)
    savePortionCorrections(supabase, session.user.id, saved?.id, MEAL_TYPE_V[mealType], components).catch(() => {})
    onSaved()
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
    else onSaved()
  }

  const fileToBase64 = f => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f)
  })

  const reset = () => {
    setStep('select'); setError(''); setCandidates([]); setChosenIdx(0)
    setComponents([]); setBarcodeResult(null); setMealName('')
    setSubwayConfig(DEFAULT_SUBWAY); setSubwayMatches([])
    setConfirmedCandidate(null)
  }

  // Derived totals for result step
  const total         = sumComps(components)
  const hasAiEstimate = components.some(c => c.source === 'ai')
  const plateScore    = total.calories > 0 ? calcPlateScore({
    calories: total.calories, protein_g: total.protein ?? 0,
    fat_g: total.fat ?? 0, fiber_g: 0, carbs_g: total.carbs ?? 0
  }) : null
  const plateInfo      = plateScore != null ? scoreInfo(plateScore) : null
  const breakdown      = plateScore != null ? getScoreBreakdown({
    calories: total.calories, protein_g: total.protein ?? 0,
    fat_g: total.fat ?? 0, fiber_g: 0, carbs_g: total.carbs ?? 0
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
                {candidates[0]?.confidence >= 70
                  ? `AI 認為是「${candidates[0].name}」（${candidates[0].confidence}%）— 如果正確直接確認`
                  : `AI 不太確定（${candidates[0]?.confidence ?? 0}%），請選最接近的選項：`
                }
              </p>

              <div className="candidates-list">
                {candidates.map((c, i) => (
                  <button key={i}
                    className={`candidate-card ${chosenIdx === i ? 'selected' : ''}`}
                    onClick={() => setChosenIdx(i)}
                  >
                    <div className="candidate-card-top">
                      <span className="candidate-name">{c.name}</span>
                      <span className="candidate-pct">{c.confidence}%</span>
                    </div>
                    <div className="candidate-conf-bar">
                      <div className="candidate-conf-fill" style={{ width: `${c.confidence}%` }}/>
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

              {/* 2. Needs-confirmation banner */}
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
                {hasAiEstimate && (
                  <p className="result-total-warn">⚠ 含 AI 估算，實際數值可能略有差異</p>
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
