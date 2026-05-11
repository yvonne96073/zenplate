import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loadFdaDb, searchFda, calcNutrition, sumNutrition, CATEGORY_EMOJI } from '../utils/fdaDb'
import { calcPlateScore } from '../utils/scoring'

const MEAL_TYPES = ['早餐', '午餐', '晚餐', '點心']
const MEAL_TYPE_VAL = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '點心': 'snack' }

// ── FDA Food Search Input ──────────────────────────────────────────────────────
function FdaSearchInput({ onAdd }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (q.trim().length < 1) { setResults([]); setShow(false); return }
    const r = searchFda(q, 10)
    setResults(r)
    setShow(true)
  }, [q])

  const pick = (item) => {
    setQ('')
    setShow(false)
    onAdd(item)
  }

  return (
    <div className="fda-search-wrap">
      <input
        className="fda-search-input"
        placeholder="搜尋 FDA 食材（如：雞胸肉、白飯、蘋果...）"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => q && results.length > 0 && setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 180)}
      />
      {show && results.length > 0 && (
        <div className="fda-search-dropdown">
          {results.map(item => (
            <button key={item.id} className="fda-search-item" onMouseDown={() => pick(item)}>
              <span className="fda-search-emoji">{CATEGORY_EMOJI[item.cat] || '🍽️'}</span>
              <div className="fda-search-info">
                <span className="fda-search-name">{item.n}</span>
                <span className="fda-search-cat">{item.cat}</span>
              </div>
              <span className="fda-search-cal">{item.cal ?? '–'} kcal/100g</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── One food item row ─────────────────────────────────────────────────────────
function FoodItemRow({ entry, onChange, onRemove }) {
  const { item, grams } = entry
  const nutrition = calcNutrition(item, grams)

  return (
    <div className="log-fda-row">
      <div className="log-fda-row-top">
        <span className="log-fda-emoji">{CATEGORY_EMOJI[item.cat] || '🍽️'}</span>
        <span className="log-fda-name">{item.n}</span>
        <button className="fda-ing-rm" onClick={onRemove}>✕</button>
      </div>
      <div className="log-fda-row-bottom">
        <div className="log-fda-grams-wrap">
          <input
            className="fda-ing-grams"
            type="number"
            min="1"
            max="2000"
            value={grams}
            onChange={e => onChange({ ...entry, grams: parseInt(e.target.value) || 0 })}
          />
          <span className="fda-ing-grams-lbl">g</span>
        </div>
        <div className="log-fda-macros">
          <span>{nutrition.calories ?? '–'} kcal</span>
          <span>蛋白 {nutrition.protein ?? '–'}g</span>
          <span>碳水 {nutrition.carbs ?? '–'}g</span>
          <span>脂肪 {nutrition.fat ?? '–'}g</span>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LogMealModal({ session, onClose, onSaved }) {
  const [tab,       setTab]       = useState('fda')   // 'fda' | 'manual'
  const [mealType,  setMealType]  = useState('午餐')
  const [mealName,  setMealName]  = useState('')
  const [entries,   setEntries]   = useState([])      // [{item, grams}]
  const [dbReady,   setDbReady]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  // Manual tab state
  const [manual, setManual] = useState({
    name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: ''
  })
  const setM = (k, v) => setManual(f => ({ ...f, [k]: v }))

  useEffect(() => {
    loadFdaDb().then(() => setDbReady(true)).catch(() => setDbReady(false))
  }, [])

  const addItem = (fdaItem) => {
    setEntries(prev => {
      const exists = prev.find(e => e.item.id === fdaItem.id)
      if (exists) {
        return prev.map(e => e.item.id === fdaItem.id
          ? { ...e, grams: e.grams + 100 }
          : e)
      }
      return [...prev, { item: fdaItem, grams: 100 }]
    })
  }

  const nutrition  = sumNutrition(entries.map(e => calcNutrition(e.item, e.grams)))

  const handleSaveFda = async () => {
    if (entries.length === 0) { setError('請至少加入一項食材'); return }
    setLoading(true); setError('')
    const { error: dbErr } = await supabase.from('meals').insert({
      user_id:   session.user.id,
      name:      mealName.trim() || entries.map(e => e.item.n).join(' + '),
      meal_type: MEAL_TYPE_VAL[mealType],
      calories:  Math.round(nutrition.calories || 0),
      protein_g: nutrition.protein || 0,
      carbs_g:   nutrition.carbs || 0,
      fat_g:     nutrition.fat || 0,
      fiber_g:   nutrition.fiber || 0,
      data_source: 'Taiwan FDA 2025',
    })
    setLoading(false)
    if (dbErr) setError(dbErr.message)
    else onSaved(calcPlateScore({
      calories:  Math.round(nutrition.calories || 0),
      protein_g: nutrition.protein || 0,
      carbs_g:   nutrition.carbs || 0,
      fat_g:     nutrition.fat || 0,
      fiber_g:   nutrition.fiber || 0,
    }))
  }

  const handleSaveManual = async (e) => {
    e.preventDefault()
    if (!manual.name.trim()) { setError('請輸入餐點名稱'); return }
    if (!manual.calories)    { setError('請輸入卡路里'); return }
    setLoading(true); setError('')
    const { error: dbErr } = await supabase.from('meals').insert({
      user_id:   session.user.id,
      name:      manual.name.trim(),
      meal_type: MEAL_TYPE_VAL[mealType],
      calories:  parseInt(manual.calories) || 0,
      protein_g: parseFloat(manual.protein_g) || 0,
      carbs_g:   parseFloat(manual.carbs_g) || 0,
      fat_g:     parseFloat(manual.fat_g) || 0,
      fiber_g:   parseFloat(manual.fiber_g) || 0,
      data_source: 'manual',
    })
    setLoading(false)
    if (dbErr) setError(dbErr.message)
    else onSaved(calcPlateScore({
      calories:  parseInt(manual.calories) || 0,
      protein_g: parseFloat(manual.protein_g) || 0,
      carbs_g:   parseFloat(manual.carbs_g) || 0,
      fat_g:     parseFloat(manual.fat_g) || 0,
      fiber_g:   parseFloat(manual.fiber_g) || 0,
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-content">
          <h3 className="modal-title">記錄餐點 🥗</h3>

          {/* Tab toggle */}
          <div className="log-tab-row">
            <button className={`log-tab-btn ${tab === 'fda' ? 'active' : ''}`} onClick={() => setTab('fda')}>
              FDA 查詢
            </button>
            <button className={`log-tab-btn ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
              手動輸入
            </button>
          </div>

          {/* Meal type (shared) */}
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

          {/* ── FDA tab ── */}
          {tab === 'fda' && (
            <>
              {!dbReady && <div className="fda-loading">⏳ 載入 FDA 資料庫...</div>}

              {dbReady && (
                <>
                  <FdaSearchInput onAdd={addItem}/>

                  {entries.length > 0 && (
                    <>
                      <div className="log-fda-list">
                        {entries.map((entry, i) => (
                          <FoodItemRow
                            key={entry.item.id}
                            entry={entry}
                            onChange={updated => {
                              const copy = [...entries]; copy[i] = updated; setEntries(copy)
                            }}
                            onRemove={() => setEntries(entries.filter((_, j) => j !== i))}
                          />
                        ))}
                      </div>

                      {/* Totals */}
                      <div className="fda-totals">
                        <div className="fda-total-title">📊 總計（FDA 計算）</div>
                        <div className="fda-total-row">
                          {[
                            ['calories', 'kcal'],
                            ['protein',  '蛋白質 g'],
                            ['carbs',    '碳水 g'],
                            ['fat',      '脂肪 g'],
                          ].map(([k, lbl]) => (
                            <div key={k} className="fda-total-item">
                              <span className="fda-total-val">{nutrition[k] ?? '–'}</span>
                              <span className="fda-total-lbl">{lbl}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Optional meal name */}
                      <div className="form-group" style={{ marginTop: 10 }}>
                        <label>餐點名稱（可選）</label>
                        <input className="form-input"
                          placeholder={entries.map(e => e.item.n).join(' + ').slice(0, 40)}
                          value={mealName}
                          onChange={e => setMealName(e.target.value)}/>
                      </div>

                      <div className="fda-badge" style={{ marginBottom: 12 }}>
                        🏛️ 數值來自：<strong>台灣 FDA 食品成分資料庫 2025</strong>
                      </div>
                    </>
                  )}

                  {error && <p className="login-error">{error}</p>}

                  <button className="submit-btn" onClick={handleSaveFda}
                    disabled={loading || entries.length === 0}>
                    {loading ? '儲存中...' : `✓ 記錄餐點（${entries.length} 項）`}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Manual tab ── */}
          {tab === 'manual' && (
            <form onSubmit={handleSaveManual}>
              <div className="form-group">
                <label>餐點名稱 *</label>
                <input className="form-input" placeholder="例如：雞排便當"
                  value={manual.name} onChange={e => setM('name', e.target.value)}/>
              </div>
              <div className="form-group">
                <label>卡路里 (kcal) *</label>
                <input className="form-input" type="number" placeholder="0"
                  min="0" value={manual.calories}
                  onChange={e => setM('calories', e.target.value)}/>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>蛋白質 (g)</label>
                  <input className="form-input" type="number" placeholder="0" min="0"
                    value={manual.protein_g} onChange={e => setM('protein_g', e.target.value)}/>
                </div>
                <div className="form-group half">
                  <label>碳水 (g)</label>
                  <input className="form-input" type="number" placeholder="0" min="0"
                    value={manual.carbs_g} onChange={e => setM('carbs_g', e.target.value)}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>脂肪 (g)</label>
                  <input className="form-input" type="number" placeholder="0" min="0"
                    value={manual.fat_g} onChange={e => setM('fat_g', e.target.value)}/>
                </div>
                <div className="form-group half">
                  <label>纖維 (g)</label>
                  <input className="form-input" type="number" placeholder="0" min="0"
                    value={manual.fiber_g} onChange={e => setM('fiber_g', e.target.value)}/>
                </div>
              </div>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? '儲存中...' : '✓ 記錄餐點'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
