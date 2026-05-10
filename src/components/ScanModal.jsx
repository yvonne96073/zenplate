import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'
import { loadFdaDb, lookupByName, searchFda, calcNutrition, CATEGORY_EMOJI } from '../utils/fdaDb'
import { matchNycuDish } from '../utils/nycuDb'
import { lookupPackagedFood } from '../data/packagedFoods'
import { isSubwayContext, matchSubwayItems, calcSubwayMeal, SUBWAY_DB, subwayByCategory } from '../utils/subwayDb'
import { lookupComponent, compNutrition, COMPONENT_ID_LIST } from '../utils/portionDb'
import { calcPlateScore, scoreInfo, getScoreBreakdown } from '../utils/scoring'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const MEAL_TYPES   = ['早餐', '午餐', '晚餐', '點心']
const MEAL_TYPE_V  = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '點心': 'snack' }
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest']

// ── Vision prompt — identity + portion estimate are both required ─────────────
const VISION_PROMPT = `你是台灣 AI 營養師。每次分析必須同時完成兩件事：
1. 辨識食物身份
2. 從畫面視覺估算實際份量（g）

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
      "name": "餐點名稱（中文）",
      "confidence": 80,
      "clues": ["食物辨識依據", "份量判斷依據"],
      "packaged": false,
      "brand": "",
      "components": [
        {
          "name": "white_rice",
          "grams": 220,
          "portion_confidence": 75,
          "cal_est": 286,
          "pro_est": 5.3,
          "carb_est": 63,
          "fat_est": 0.5,
          "hint": "約1碗"
        }
      ]
    }
  ]
}

規則：
1. 永遠回傳 3 個 candidates，由高到低信心度排序
2. confidence / portion_confidence：0-100 整數
3. portion_confidence 判斷基準：
   80+ = 密封包裝、完整餐盒、份量明確
   55-79 = 大致可判斷（家常菜、標準碗盤）
   30-54 = 不確定（混合料理、醬汁、看不清的配料）
4. grams = 畫面中實際份量的視覺估算，不是資料庫標準份量
5. cal_est / pro_est / carb_est / fat_est = 該 grams 份量的總估計值，不是每100g
6. 多個食物 → components 分列每個品項，每個都要估算 grams 和 portion_confidence
7. 包裝食品 → packaged:true，brand 填品牌名
8. 就算不確定也要給最佳猜測，不可回傳空 candidates
9. component name 欄位：優先用上方清單的英文 ID，找不到才用中文
10. 看到 Subway 店面/包裝/logo → brand 填 "Subway"，name 填菜單品項中文名稱`

// ── Source metadata ───────────────────────────────────────────────────────────
const SRC_LABEL = { fda: 'FDA', nycu: '交大', packaged: '包裝', ai: 'AI估算', subway: 'Subway官方', portion: '份量庫' }
const SRC_COLOR = { fda: '#2BB5A0', nycu: '#4CAF50', packaged: '#FF9800', ai: '#9E9E9E', subway: '#00833D', portion: '#7C3AED' }

// ── Default Subway config ─────────────────────────────────────────────────────
const DEFAULT_SUBWAY = { sandwichId: null, breadId: 'bread_white', sauceIds: [], sizeMult: 1 }

// ── Enrich one AI component with DB data ─────────────────────────────────────
function enrichComp(ai, dbReady) {
  const base = {
    aiName: ai.name, grams: ai.grams || 100, baseGrams: ai.grams || 100,
    portionMult: 1, calEst: ai.cal_est || 0, hint: ai.hint || '',
    portionConf: ai.portion_confidence ?? 55,   // 0-100, drives warning UI
    proEst:  ai.pro_est  ?? null,
    carbEst: ai.carb_est ?? null,
    fatEst:  ai.fat_est  ?? null,
  }

  // 1. NYCU campus DB — high threshold to avoid hijacking generic ingredients
  const nycu = matchNycuDish(ai.name)
  if (nycu && nycu.score >= 70) {
    return { ...base, name: nycu.dish.dishZh, source: 'nycu', nycuDish: nycu.dish, fdaItem: null, portionItem: null }
  }

  // 2. Portion DB — curated Taiwan food components with S/M/L priors
  const portionItem = lookupComponent(ai.name)
  if (portionItem) {
    // Use AI gram estimate; derive S/M/L from portionItem.portions
    const aiG = ai.grams || portionItem.default_g || portionItem.portions.medium
    return { ...base, name: portionItem.name_zh, source: 'portion', portionItem, fdaItem: null, nycuDish: null, grams: aiG, baseGrams: aiG }
  }

  // 3. FDA DB
  if (dbReady) {
    const fda = lookupByName(ai.name) || (searchFda(ai.name, 1)[0] || null)
    if (fda) return { ...base, name: fda.n, source: 'fda', fdaItem: fda, nycuDish: null, portionItem: null }
  }

  // 4. AI estimate fallback — always succeeds
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

// ── Component row — gram-first design ────────────────────────────────────────
const GRAM_OPTS = [50, 100, 150, 200, 300]
const SLM_LABELS = { small: 'S', medium: 'M', large: 'L' }

function ComponentRow({ comp, onChange, onRemove, dbReady }) {
  const nut = calcCompNut(comp)

  const isFdaBased     = comp.source === 'fda' || comp.source === 'packaged'
  const isPortionBased = comp.source === 'portion' && comp.portionItem
  const isCountBased   = isPortionBased && comp.portionItem.count_based

  const actualGrams = isFdaBased
    ? comp.grams
    : isPortionBased
      ? comp.grams
      : Math.round((comp.baseGrams || 100) * (comp.portionMult || 1))

  // For AI/NYCU: gram buttons derived from baseGrams × multiples
  const aiGramOpts = [0.5, 1, 1.5, 2].map(m => ({
    mult: m, grams: Math.round((comp.baseGrams || 100) * m),
  }))

  const portionLow = (comp.portionConf ?? 55) < 55

  // Count-based quantity helper
  const pieceG    = comp.portionItem?.per_piece_g || 1
  const quantity  = isCountBased ? Math.max(1, Math.round(comp.grams / pieceG)) : 1
  const setQty    = (q) => onChange({ ...comp, grams: Math.max(pieceG, q * pieceG) })

  return (
    <div className="comp-row">
      {/* Header: source + name + gram badge */}
      <div className="comp-row-header">
        <span className="comp-src-tag" style={{ background: SRC_COLOR[comp.source] }}>
          {SRC_LABEL[comp.source]}
        </span>
        <span className="comp-name">{comp.name}</span>
        <span className="comp-gram-badge">{actualGrams}g</span>
        <button className="comp-rm" onClick={onRemove}>✕</button>
      </div>

      {/* Low portion-confidence warning */}
      {portionLow && (
        <p className="comp-portion-warn">⚠️ 份量估算不確定，請依實際情況調整</p>
      )}

      {/* Portion controls */}
      <p className="comp-portion-label">調整份量</p>

      {/* Portion DB — S/M/L buttons */}
      {isPortionBased && !isCountBased && (
        <div className="slm-row">
          {['small','medium','large'].map(sz => {
            const g = comp.portionItem.portions[sz]
            return (
              <button key={sz}
                className={`slm-btn ${comp.grams === g ? 'active' : ''}`}
                onClick={() => onChange({ ...comp, grams: g })}>
                <span className="slm-size">{SLM_LABELS[sz]}</span>
                <span className="slm-g">{g}g</span>
              </button>
            )
          })}
          <input className="portion-input" type="number" min="1" max="2000"
            value={comp.grams}
            onChange={e => onChange({ ...comp, grams: Math.max(1, parseInt(e.target.value) || comp.grams) })}/>
        </div>
      )}

      {/* Portion DB count-based — quantity +/- */}
      {isCountBased && (
        <div className="count-row">
          <button className="count-btn" onClick={() => setQty(Math.max(1, quantity - 1))}>−</button>
          <span className="count-val">{quantity} 份 ({actualGrams}g)</span>
          <button className="count-btn" onClick={() => setQty(quantity + 1)}>＋</button>
        </div>
      )}

      {/* FDA grams */}
      {isFdaBased && (
        <div className="comp-portion-row">
          {GRAM_OPTS.map(g => (
            <button key={g}
              className={`portion-btn ${comp.grams === g ? 'active' : ''}`}
              onClick={() => onChange({ ...comp, grams: g })}>{g}g</button>
          ))}
          <input className="portion-input" type="number" min="1" max="2000"
            value={comp.grams}
            onChange={e => onChange({ ...comp, grams: parseInt(e.target.value) || comp.grams })}/>
        </div>
      )}

      {/* AI/NYCU — gram multiples */}
      {!isFdaBased && !isPortionBased && (
        <div className="comp-portion-row">
          {aiGramOpts.map(({ mult, grams }) => (
            <button key={mult}
              className={`portion-btn ${comp.portionMult == mult ? 'active' : ''}`}
              onClick={() => onChange({ ...comp, portionMult: mult })}>{grams}g</button>
          ))}
          <input className="portion-input" type="number" min="1" max="2000"
            value={actualGrams}
            onChange={e => {
              const g = Math.max(1, parseInt(e.target.value) || comp.baseGrams)
              onChange({ ...comp, portionMult: g / (comp.baseGrams || 100) })
            }}/>
        </div>
      )}

      {/* Nutrition result */}
      <div className="comp-nut-row">
        <span className="comp-nut-cal">{nut.calories ?? '?'} kcal</span>
        {nut.protein != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">蛋白 {nut.protein}g</span></>}
        {nut.carbs   != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">碳水 {nut.carbs}g</span></>}
        {nut.fat     != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">脂肪 {nut.fat}g</span></>}
      </div>

      {/* FDA override search */}
      {comp.source !== 'fda' && dbReady && (
        <FdaSearch compact initialQuery={comp.aiName || comp.name}
          onSelect={item => onChange({ ...comp, name: item.n, source: 'fda',
            fdaItem: item, portionItem: null, grams: actualGrams })}/>
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
  const [candidates, setCandidates] = useState([])
  const [chosenIdx,  setChosenIdx]  = useState(0)

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

  // ── User confirms a candidate → build component list ─────────────────────
  const confirmCandidate = (idx) => {
    const cand = candidates[idx]
    setMealName(cand.name)

    // ── Subway branch ─────────────────────────────────────────────────────
    if (isSubwayContext(cand)) {
      const matches = matchSubwayItems(cand.name, 3)
      setSubwayMatches(matches)
      setSubwayConfig({
        ...DEFAULT_SUBWAY,
        sandwichId: matches[0]?.item_id ?? null,
      })
      setStep('subway')
      return
    }

    // Packaged food → try local packaged DB first
    if (cand.packaged) {
      const pkg = lookupPackagedFood(cand.brand || '', cand.components?.[0]?.name || cand.name)
      if (pkg) {
        setComponents([{
          name: `${pkg.item.brand} ${pkg.item.name}`,
          aiName: cand.name, grams: pkg.item.per, baseGrams: pkg.item.per,
          portionMult: 1, calEst: 0, hint: `${pkg.item.per}g/份`,
          source: 'packaged', packagedItem: pkg, fdaItem: null, nycuDish: null,
        }])
        setStep('result'); return
      }
    }

    // Build one component per AI component
    const aiComps = cand.components?.length
      ? cand.components
      : [{ name: cand.name, grams: 200, cal_est: cand.components?.[0]?.cal_est || 300, hint: '1份' }]

    setComponents(aiComps.map(ai => enrichComp(ai, dbReady)))
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

    const { error: dbErr } = await supabase.from('meals').insert(payload)
    setSaving(false)
    if (dbErr) setError(dbErr.message)
    else onSaved()
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
                      {c.clues?.slice(0, 2).map((cl, j) => (
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
              <h3 className="modal-title">確認餐點內容 ✅</h3>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>餐點名稱</label>
                <input className="form-input" value={mealName}
                  onChange={e => setMealName(e.target.value)}/>
              </div>

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

              {/* Total nutrition */}
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

              {/* Plate Score breakdown */}
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
