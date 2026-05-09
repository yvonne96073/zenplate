import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'
import { loadFdaDb, lookupByName, searchFda, calcNutrition, CATEGORY_EMOJI } from '../utils/fdaDb'
import { matchNycuDish } from '../utils/nycuDb'
import { lookupPackagedFood } from '../data/packagedFoods'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const MEAL_TYPES   = ['早餐', '午餐', '晚餐', '點心']
const MEAL_TYPE_V  = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '點心': 'snack' }
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest']

// ── New multi-candidate prompt ────────────────────────────────────────────────
const VISION_PROMPT = `你是台灣 AI 營養師，分析食物照片。

仔細觀察所有細節：食物外觀、包裝文字、容器形狀、品牌顏色、餐廳環境、托盤、旁邊的物品。

只回傳 JSON（不加任何說明或 markdown）：
{
  "candidates": [
    {
      "name": "食物名稱（中文）",
      "confidence": 75,
      "clues": ["判斷依據1", "判斷依據2"],
      "packaged": false,
      "brand": "",
      "components": [
        { "name": "食材或品項名稱", "grams": 150, "cal_est": 200, "hint": "1碗" }
      ]
    }
  ]
}

規則：
1. 永遠回傳 3 個 candidates，由高到低信心度排序
2. confidence：0-100 整數
3. 多個食物（便當/托盤/套餐）→ components 分列每個品項
4. 包裝食品 → packaged:true，brand 填品牌名
5. cal_est = 該份量的估計熱量（kcal），不是每 100g
6. 就算不確定也要給最佳猜測，不可以回傳空 candidates
7. 使用台灣常用中文食物名稱`

// ── Source metadata ───────────────────────────────────────────────────────────
const SRC_LABEL = { fda: 'FDA', nycu: '交大', packaged: '包裝', ai: 'AI估算' }
const SRC_COLOR = { fda: '#2BB5A0', nycu: '#4CAF50', packaged: '#FF9800', ai: '#9E9E9E' }

// ── Enrich one AI component with DB data ─────────────────────────────────────
function enrichComp(ai, dbReady) {
  const base = {
    aiName: ai.name, grams: ai.grams || 100, baseGrams: ai.grams || 100,
    portionMult: 1, calEst: ai.cal_est || 0, hint: ai.hint || '',
  }

  // 1. NYCU campus DB
  const nycu = matchNycuDish(ai.name)
  if (nycu && nycu.score >= 40) {
    return { ...base, name: nycu.dish.dishZh, source: 'nycu', nycuDish: nycu.dish, fdaItem: null }
  }

  // 2. FDA DB
  if (dbReady) {
    const fda = lookupByName(ai.name) || (searchFda(ai.name, 1)[0] || null)
    if (fda) return { ...base, name: fda.n, source: 'fda', fdaItem: fda, nycuDish: null }
  }

  // 3. AI estimate fallback — always succeeds
  return { ...base, name: ai.name, source: 'ai', fdaItem: null, nycuDish: null }
}

// ── Nutrition for one component ───────────────────────────────────────────────
function calcCompNut(comp) {
  const m = comp.portionMult ?? 1
  if (comp.source === 'fda' && comp.fdaItem)
    return calcNutrition(comp.fdaItem, comp.grams)
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
  // AI estimate — calories only
  return { calories: Math.round((comp.calEst || 0) * m), protein: null, carbs: null, fat: null, fiber: 0 }
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

// ── Component row with portion controls ──────────────────────────────────────
const MULT_LABELS = { 0.5: '½份', 1: '1份', 1.5: '1.5份', 2: '2份' }
const GRAM_OPTS   = [50, 100, 150, 200, 300]

function ComponentRow({ comp, onChange, onRemove, dbReady }) {
  const nut = calcCompNut(comp)

  return (
    <div className="comp-row">
      <div className="comp-row-header">
        <span className="comp-src-tag" style={{ background: SRC_COLOR[comp.source] }}>
          {SRC_LABEL[comp.source]}
        </span>
        <span className="comp-name">{comp.name}</span>
        {comp.hint ? <span className="comp-hint">{comp.hint}</span> : null}
        <button className="comp-rm" onClick={onRemove}>✕</button>
      </div>

      {/* Portion controls */}
      <div className="comp-portion-row">
        {comp.source === 'fda'
          ? <>
              {GRAM_OPTS.map(g => (
                <button key={g} className={`portion-btn ${comp.grams === g ? 'active' : ''}`}
                  onClick={() => onChange({ ...comp, grams: g })}>{g}g</button>
              ))}
              <input className="portion-input" type="number" min="1" max="2000"
                value={comp.grams}
                onChange={e => onChange({ ...comp, grams: parseInt(e.target.value) || comp.grams })}/>
            </>
          : Object.entries(MULT_LABELS).map(([m, label]) => (
              <button key={m}
                className={`portion-btn ${comp.portionMult == m ? 'active' : ''}`}
                onClick={() => onChange({ ...comp, portionMult: +m })}>{label}</button>
            ))
        }
      </div>

      {/* Nutrition */}
      <div className="comp-nut-row">
        <span className="comp-nut-cal">{nut.calories ?? '?'} kcal</span>
        {nut.protein != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">蛋白 {nut.protein}g</span></>}
        {nut.carbs   != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">碳水 {nut.carbs}g</span></>}
        {nut.fat     != null && <><span className="comp-nut-dot">·</span><span className="comp-nut-m">脂肪 {nut.fat}g</span></>}
      </div>

      {/* FDA override search for non-FDA items */}
      {comp.source !== 'fda' && dbReady && (
        <FdaSearch compact initialQuery={comp.aiName}
          onSelect={item => onChange({ ...comp, name: item.n, source: 'fda', fdaItem: item })}/>
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

  const fileToBase64 = f => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f)
  })

  const reset = () => {
    setStep('select'); setError(''); setCandidates([]); setChosenIdx(0)
    setComponents([]); setBarcodeResult(null); setMealName('')
  }

  // Derived totals for result step
  const total        = sumComps(components)
  const hasAiEstimate = components.some(c => c.source === 'ai')

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
