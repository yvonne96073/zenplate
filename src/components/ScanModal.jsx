import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'
import { loadFdaDb, lookupByName, searchFda, calcNutrition, sumNutrition, CATEGORY_EMOJI } from '../utils/fdaDb'
import { matchNycuDish } from '../utils/nycuDb'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

const MEAL_TYPES = ['早餐', '午餐', '晚餐', '點心']
const MEAL_TYPE_VAL = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '點心': 'snack' }

// ── Gemini prompt — ask for FDA-friendly Chinese food names ───────────────────
const VISION_PROMPT = `你是台灣的營養師，正在協助一個飲食追蹤 app 辨識食物照片。

請仔細分析這張照片，辨識食物並回傳 JSON，格式如下：

如果是單一食材（例如：白飯、雞腿、蘋果）：
{"type":"simple","nameZh":"食物名稱","estimatedGrams":150}

如果是複合料理（例如：便當、炒飯、麵食）：
{"type":"compound","dishName":"料理名稱","ingredients":[
  {"nameZh":"食材名稱","estimatedGrams":200},
  {"nameZh":"食材名稱","estimatedGrams":80}
]}

重要規則：
1. 只回傳 JSON，不要加任何說明或 markdown
2. nameZh 請使用台灣 FDA 食品成分資料庫的標準名稱，例如：白飯、糙米飯、雞腿、雞胸肉、豬里肌、豬五花、牛腱、空心菜、高麗菜、青花椰菜、花椰菜、雞蛋、豆腐、豆干等
3. estimatedGrams 為估計克數
4. 複合料理請拆解成主要食材（3-6 種），不要太細
5. 如果無法辨識，回傳 {"type":"unknown"}`

// ── Helper: try FDA lookup, fallback to search ────────────────────────────────
function findFdaItem(nameZh) {
  const exact = lookupByName(nameZh)
  if (exact) return exact
  const results = searchFda(nameZh, 1)
  return results[0] || null
}

// ── Ingredient row (for compound dish editing) ────────────────────────────────
function IngredientRow({ ing, onUpdate, onRemove }) {
  const matched = ing.fdaItem
  const cat = matched ? (CATEGORY_EMOJI[matched.cat] || '🍽️') : '❓'
  const nutrition = matched ? calcNutrition(matched, ing.grams) : null

  return (
    <div className="fda-ing-row">
      <div className="fda-ing-top">
        <span className="fda-ing-cat">{cat}</span>
        <span className="fda-ing-name">{matched ? matched.n : ing.nameZh}</span>
        {!matched && <span className="fda-ing-warn">未找到</span>}
        <button className="fda-ing-rm" onClick={onRemove}>✕</button>
      </div>
      <div className="fda-ing-bottom">
        <input
          className="fda-ing-grams"
          type="number"
          min="1"
          max="2000"
          value={ing.grams}
          onChange={e => onUpdate({ ...ing, grams: parseInt(e.target.value) || 0 })}
        />
        <span className="fda-ing-grams-lbl">g</span>
        {nutrition && (
          <span className="fda-ing-cal">{nutrition.calories ?? '–'} kcal</span>
        )}
      </div>
      {!matched && (
        <FdaSearch
          initialQuery={ing.nameZh}
          onSelect={(item) => onUpdate({ ...ing, fdaItem: item, nameZh: item.n })}
          compact
        />
      )}
    </div>
  )
}

// ── Inline FDA search dropdown ────────────────────────────────────────────────
function FdaSearch({ initialQuery = '', onSelect, compact = false }) {
  const [q, setQ] = useState(initialQuery)
  const [results, setResults] = useState([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (q.trim().length < 1) { setResults([]); return }
    const r = searchFda(q, 8)
    setResults(r)
    setShow(true)
  }, [q])

  const pick = (item) => {
    setQ(item.n)
    setShow(false)
    onSelect(item)
  }

  return (
    <div className={`fda-search-wrap ${compact ? 'compact' : ''}`}>
      <input
        className="fda-search-input"
        placeholder="搜尋食材..."
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => q && setShow(true)}
      />
      {show && results.length > 0 && (
        <div className="fda-search-dropdown">
          {results.map(item => (
            <button key={item.id} className="fda-search-item" onMouseDown={() => pick(item)}>
              <span className="fda-search-emoji">{CATEGORY_EMOJI[item.cat] || '🍽️'}</span>
              <span className="fda-search-name">{item.n}</span>
              <span className="fda-search-cat">{item.cat}</span>
              <span className="fda-search-cal">{item.cal ?? '–'} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScanModal({ session, onClose, onSaved }) {
  const [mode,      setMode]      = useState(null)
  const [scanning,  setScanning]  = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [step,      setStep]      = useState('select')  // select | result | confirm
  const [error,     setError]     = useState('')
  const [mealType,  setMealType]  = useState('午餐')
  const [saving,    setSaving]    = useState(false)
  const [dbReady,   setDbReady]   = useState(false)

  // Result state
  const [dishName,  setDishName]  = useState('')
  const [ingredients, setIngredients] = useState([])   // [{nameZh, grams, fdaItem}]
  const [simpleGrams, setSimpleGrams] = useState(150)  // for simple single-food results
  const [isCompound, setIsCompound]  = useState(false)
  const [fdaSource,  setFdaSource]   = useState(true)  // false = barcode / manual

  // Barcode fallback result (OpenFoodFacts, no FDA)
  const [barcodeResult, setBarcodeResult] = useState(null)

  // NYCU campus restaurant match
  const [nycuSource,  setNycuSource]  = useState(false)
  const [nycuResult,  setNycuResult]  = useState(null)  // { dish, score, confidence }

  const videoRef    = useRef(null)
  const codeRef     = useRef(null)
  const fileInputRef = useRef(null)

  // Load FDA DB eagerly when modal opens
  useEffect(() => {
    loadFdaDb().then(() => setDbReady(true)).catch(() => setDbReady(false))
    return () => codeRef.current?.reset()
  }, [])

  // ── Barcode scan ──────────────────────────────────────────────────────────
  const startBarcodeScan = async () => {
    setMode('barcode'); setScanning(true); setError('')
    setTimeout(async () => {
      try {
        const reader = new BrowserMultiFormatReader()
        codeRef.current = reader
        await reader.decodeFromVideoDevice(null, videoRef.current, async (res) => {
          if (res) {
            reader.reset(); setScanning(false)
            await lookupBarcode(res.getText())
          }
        })
      } catch {
        setError('無法存取相機，請確認已允許相機權限。')
        setScanning(false); setMode(null)
      }
    }, 100)
  }

  const lookupBarcode = async (barcode) => {
    setAnalyzing(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p = data.product
        const n = p.nutriments || {}
        // Try to find in FDA by product name
        const fdaItem = dbReady ? findFdaItem(p.product_name || '') : null
        if (fdaItem) {
          setDishName(fdaItem.n)
          setIngredients([{ nameZh: fdaItem.n, grams: 100, fdaItem }])
          setIsCompound(false); setFdaSource(true)
        } else {
          // Fallback to OpenFoodFacts values
          setBarcodeResult({
            name: p.product_name || p.product_name_en || '未知商品',
            calories: Math.round(n['energy-kcal_100g'] || 0),
            protein_g: +(n.proteins_100g || 0).toFixed(1),
            carbs_g:   +(n.carbohydrates_100g || 0).toFixed(1),
            fat_g:     +(n.fat_100g || 0).toFixed(1),
            fiber_g:   +(n.fiber_100g || 0).toFixed(1),
          })
          setFdaSource(false)
        }
        setStep('result')
      } else {
        setError(`找不到條碼 ${barcode} 的商品，請改用 AI 拍照或手動輸入。`)
        setMode(null)
      }
    } catch {
      setError('查詢失敗，請確認網路連線。')
      setMode(null)
    }
    setAnalyzing(false)
  }

  // ── AI photo scan ─────────────────────────────────────────────────────────
  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMode('photo'); setAnalyzing(true); setError('')

    try {
      const base64 = await fileToBase64(file)
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const resp   = await model.generateContent([
        { inlineData: { data: base64.split(',')[1], mimeType: file.type || 'image/jpeg' } },
        VISION_PROMPT,
      ])
      const text  = resp.response.text().trim()
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI 未回傳有效 JSON')

      const parsed = JSON.parse(match[0])

      if (parsed.type === 'unknown') {
        setError('無法辨識食物，請重試或手動新增。')
        setMode(null); setAnalyzing(false); return
      }

      if (parsed.type === 'simple') {
        const queryName = parsed.nameZh
        // Try NYCU first (simple foods unlikely to match, but check anyway)
        const nycu = matchNycuDish(queryName)
        if (nycu && (nycu.confidence === 'high' || nycu.confidence === 'medium')) {
          setDishName(nycu.dish.dishZh)
          setNycuSource(true)
          setNycuResult(nycu)
          setFdaSource(false)
        } else {
          const fdaItem = dbReady ? findFdaItem(queryName) : null
          setDishName(queryName)
          setSimpleGrams(parsed.estimatedGrams || 150)
          setIngredients([{ nameZh: queryName, grams: parsed.estimatedGrams || 150, fdaItem }])
          setIsCompound(false)
          setFdaSource(true)
        }
      } else {
        // compound — try NYCU match by dish name
        const queryName = parsed.dishName || '複合料理'
        const nycu = matchNycuDish(queryName)
        if (nycu && (nycu.confidence === 'high' || nycu.confidence === 'medium')) {
          setDishName(nycu.dish.dishZh)
          setNycuSource(true)
          setNycuResult(nycu)
          setFdaSource(false)
        } else {
          const ings = (parsed.ingredients || []).map(ing => ({
            nameZh:  ing.nameZh,
            grams:   ing.estimatedGrams || 100,
            fdaItem: dbReady ? findFdaItem(ing.nameZh) : null,
          }))
          setDishName(queryName)
          setIngredients(ings)
          setIsCompound(true)
          setFdaSource(true)
        }
      }
      setStep('result')
    } catch (err) {
      setError('AI 辨識失敗：' + err.message)
      setMode(null)
    }
    setAnalyzing(false)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    let payload

    if (nycuSource && nycuResult) {
      const d = nycuResult.dish
      payload = {
        user_id:   session.user.id,
        name:      dishName,
        meal_type: MEAL_TYPE_VAL[mealType],
        calories:  d.cal,
        protein_g: d.pro,
        carbs_g:   d.carb,
        fat_g:     d.fat,
        fiber_g:   0,
        data_source: `NYCU ${d.restaurantZh}`,
      }
    } else if (!fdaSource && barcodeResult) {
      payload = {
        user_id:  session.user.id,
        name:     barcodeResult.name,
        meal_type: MEAL_TYPE_VAL[mealType],
        calories:  barcodeResult.calories,
        protein_g: barcodeResult.protein_g,
        carbs_g:   barcodeResult.carbs_g,
        fat_g:     barcodeResult.fat_g,
        fiber_g:   barcodeResult.fiber_g,
        data_source: 'OpenFoodFacts',
      }
    } else {
      const matched = ingredients.filter(i => i.fdaItem)
      if (matched.length === 0) {
        setError('請至少確認一項食材')
        setSaving(false); return
      }
      const nutritions = matched.map(i => calcNutrition(i.fdaItem, i.grams))
      const totals = sumNutrition(nutritions)
      payload = {
        user_id:   session.user.id,
        name:      dishName,
        meal_type: MEAL_TYPE_VAL[mealType],
        calories:  Math.round(totals.calories || 0),
        protein_g: totals.protein || 0,
        carbs_g:   totals.carbs || 0,
        fat_g:     totals.fat || 0,
        fiber_g:   totals.fiber || 0,
        data_source: 'Taiwan FDA 2025',
      }
    }

    const { error: dbErr } = await supabase.from('meals').insert(payload)
    setSaving(false)
    if (dbErr) setError(dbErr.message)
    else onSaved()
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })

  const reset = () => {
    setStep('select'); setMode(null); setError('')
    setIngredients([]); setBarcodeResult(null); setFdaSource(true)
    setNycuSource(false); setNycuResult(null)
  }

  // ── Derived: total nutrition from FDA ingredients ─────────────────────────
  const matchedIngs  = ingredients.filter(i => i.fdaItem)
  const nutritions   = matchedIngs.map(i => calcNutrition(i.fdaItem, i.grams))
  const totals       = sumNutrition(nutritions)

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-content">

          {/* ── Mode select ── */}
          {step === 'select' && (
            <>
              <h3 className="modal-title">掃描食物 📷</h3>
              {!dbReady && (
                <div className="fda-loading">⏳ 載入 FDA 食品資料庫...</div>
              )}
              {error && <p className="login-error" style={{ marginBottom: 12 }}>{error}</p>}
              <div className="scan-options">
                <button className="scan-option-btn" onClick={startBarcodeScan}>
                  <span className="scan-option-icon">📦</span>
                  <span className="scan-option-label">掃條碼</span>
                  <span className="scan-option-sub">包裝食品</span>
                </button>
                <button className="scan-option-btn" onClick={() => fileInputRef.current?.click()}>
                  <span className="scan-option-icon">🤖</span>
                  <span className="scan-option-label">AI 辨識</span>
                  <span className="scan-option-sub">拍照 → FDA 查詢</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                style={{ display:'none' }} onChange={handlePhotoCapture}/>

              {/* FDA search entry */}
              <div className="fda-manual-section">
                <p className="fda-manual-label">🔍 直接搜尋 FDA 資料庫</p>
                {dbReady ? (
                  <FdaSearch
                    onSelect={(item) => {
                      setDishName(item.n)
                      setIngredients([{ nameZh: item.n, grams: 100, fdaItem: item }])
                      setIsCompound(false)
                      setFdaSource(true)
                      setStep('result')
                    }}
                  />
                ) : <p style={{ fontSize:12, color:'#999' }}>資料庫載入中...</p>}
              </div>

              <button className="signout-btn" style={{ marginTop: 8 }} onClick={onClose}>取消</button>
            </>
          )}

          {/* ── Camera ── */}
          {mode === 'barcode' && scanning && (
            <>
              <h3 className="modal-title">對準條碼 📦</h3>
              <div className="scan-video-wrap">
                <video ref={videoRef} style={{ width:'100%', display:'block' }}/>
                <div className="scan-crosshair"/>
              </div>
              <p className="scan-hint">自動掃描中...</p>
              <button className="signout-btn" style={{ marginTop: 12 }} onClick={() => {
                codeRef.current?.reset(); setScanning(false); setMode(null)
              }}>取消</button>
            </>
          )}

          {/* ── Analyzing ── */}
          {analyzing && (
            <>
              <h3 className="modal-title">分析中... 🤖</h3>
              <div className="scan-analyzing">
                <div className="scan-spinner">🔍</div>
                <p>AI 辨識食物 → 比對 FDA 資料庫...</p>
              </div>
            </>
          )}

          {/* ── Result (FDA ingredients) ── */}
          {step === 'result' && !analyzing && fdaSource && !nycuSource && (
            <>
              <h3 className="modal-title">確認食物內容 ✅</h3>

              {/* Dish name */}
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>餐點名稱</label>
                <input className="form-input" value={dishName}
                  onChange={e => setDishName(e.target.value)}/>
              </div>

              {/* FDA source badge */}
              <div className="fda-badge">
                🏛️ 數值來自：<strong>台灣 FDA 食品成分資料庫 2025</strong>
              </div>

              {/* Ingredient list */}
              <div className="fda-ing-list">
                {ingredients.map((ing, i) => (
                  <IngredientRow
                    key={i}
                    ing={ing}
                    onUpdate={updated => {
                      const copy = [...ingredients]
                      copy[i] = updated
                      setIngredients(copy)
                    }}
                    onRemove={() => setIngredients(ingredients.filter((_, j) => j !== i))}
                  />
                ))}

                {/* Add ingredient */}
                <div className="fda-add-section">
                  <p className="fda-add-label">＋ 新增食材</p>
                  <FdaSearch
                    key={ingredients.length}
                    onSelect={item => setIngredients(prev => [
                      ...prev,
                      { nameZh: item.n, grams: 100, fdaItem: item }
                    ])}
                  />
                </div>
              </div>

              {/* Nutrition totals from FDA */}
              {matchedIngs.length > 0 && (
                <div className="fda-totals">
                  <div className="fda-total-title">
                    📊 總計營養（FDA 計算）
                    {ingredients.length !== matchedIngs.length && (
                      <span className="fda-missing"> ⚠ {ingredients.length - matchedIngs.length} 項未匹配</span>
                    )}
                  </div>
                  <div className="fda-total-row">
                    <div className="fda-total-item">
                      <span className="fda-total-val">{totals.calories ?? '–'}</span>
                      <span className="fda-total-lbl">kcal</span>
                    </div>
                    <div className="fda-total-item">
                      <span className="fda-total-val">{totals.protein ?? '–'}</span>
                      <span className="fda-total-lbl">蛋白質 g</span>
                    </div>
                    <div className="fda-total-item">
                      <span className="fda-total-val">{totals.carbs ?? '–'}</span>
                      <span className="fda-total-lbl">碳水 g</span>
                    </div>
                    <div className="fda-total-item">
                      <span className="fda-total-val">{totals.fat ?? '–'}</span>
                      <span className="fda-total-lbl">脂肪 g</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Meal type */}
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

              <button className="submit-btn" onClick={handleSave} disabled={saving || matchedIngs.length === 0}>
                {saving ? '儲存中...' : `✓ 記錄餐點（${matchedIngs.length} 項食材）`}
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

          {/* ── Result (NYCU campus restaurant match) ── */}
          {step === 'result' && !analyzing && nycuSource && nycuResult && (
            <>
              <h3 className="modal-title">確認餐點 ✅</h3>

              <div className="fda-badge" style={{ background:'#E8F5E9', borderColor:'#81C784', color:'#2E7D32' }}>
                🏫 交大官方營養資料 ·&nbsp;
                <strong>{nycuResult.dish.restaurantZh}</strong>
                &nbsp;
                <span style={{ fontSize:11, opacity:0.75 }}>
                  信心度：{nycuResult.confidence === 'high' ? '高' : '中'}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>餐點名稱</label>
                <input className="form-input" value={dishName}
                  onChange={e => setDishName(e.target.value)}/>
              </div>

              <div className="fda-totals">
                <div className="fda-total-title">📊 官方營養成分（每份）</div>
                <div className="fda-total-row">
                  {[
                    [nycuResult.dish.cal,  'kcal'],
                    [nycuResult.dish.pro,  '蛋白質 g'],
                    [nycuResult.dish.carb, '碳水 g'],
                    [nycuResult.dish.fat,  '脂肪 g'],
                  ].map(([val, lbl]) => (
                    <div key={lbl} className="fda-total-item">
                      <span className="fda-total-val">{val ?? '–'}</span>
                      <span className="fda-total-lbl">{lbl}</span>
                    </div>
                  ))}
                </div>
                {nycuResult.dish.sod > 0 && (
                  <div style={{ fontSize:11, color:'#888', marginTop:4, textAlign:'center' }}>
                    鈉 {nycuResult.dish.sod} mg
                  </div>
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

              <button className="submit-btn" onClick={handleSave} disabled={saving}>
                {saving ? '儲存中...' : '✓ 記錄餐點（交大官方資料）'}
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

          {/* ── Result (barcode / OpenFoodFacts fallback) ── */}
          {step === 'result' && !analyzing && !fdaSource && !nycuSource && barcodeResult && (
            <>
              <h3 className="modal-title">確認餐點 ✅</h3>
              <div className="fda-badge fda-badge-warn">
                ⚠️ 此商品未在 FDA 資料庫，使用 OpenFoodFacts 數值（每 100g）
              </div>
              <div className="form-group">
                <label>餐點名稱</label>
                <input className="form-input" value={barcodeResult.name}
                  onChange={e => setBarcodeResult(r => ({ ...r, name: e.target.value }))}/>
              </div>
              <div className="form-group">
                <label>餐別</label>
                <div className="meal-type-btns">
                  {MEAL_TYPES.map(t => (
                    <button key={t} type="button"
                      className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                      onClick={() => setMealType(t)}>{t}</button>
                  ))}
                </div>
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
              {error && <p className="login-error">{error}</p>}
              <button className="submit-btn" onClick={handleSave} disabled={saving}>
                {saving ? '儲存中...' : '✓ 記錄餐點'}
              </button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={reset}>← 重新掃描</button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
