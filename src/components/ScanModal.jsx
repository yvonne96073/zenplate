import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '../lib/supabase'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export default function ScanModal({ session, onClose, onSaved }) {
  const [mode, setMode] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [saving, setSaving] = useState(false)

  const videoRef = useRef(null)
  const codeReaderRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => { codeReaderRef.current?.reset() }
  }, [])

  const startBarcodeScan = async () => {
    setMode('barcode')
    setScanning(true)
    setError('')
    setTimeout(async () => {
      try {
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader
        await codeReader.decodeFromVideoDevice(null, videoRef.current, async (res) => {
          if (res) {
            codeReader.reset()
            setScanning(false)
            await lookupBarcode(res.getText())
          }
        })
      } catch {
        setError('無法存取相機，請確認已允許相機權限。')
        setScanning(false)
        setMode(null)
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
        setResult({
          name: p.product_name || p.product_name_en || 'Unknown Product',
          calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
          protein_g: Math.round((n.proteins_100g || 0) * 10) / 10,
          carbs_g: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
          fat_g: Math.round((n.fat_100g || 0) * 10) / 10,
          fiber_g: Math.round((n.fiber_100g || 0) * 10) / 10,
        })
      } else {
        setError(`找不到條碼 ${barcode} 的商品，請改用手動輸入。`)
        setMode(null)
      }
    } catch {
      setError('查詢失敗，請確認網路連線。')
      setMode(null)
    }
    setAnalyzing(false)
  }

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMode('photo')
    setAnalyzing(true)
    setError('')
    try {
      const base64 = await fileToBase64(file)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const response = await model.generateContent([
        {
          inlineData: {
            data: base64.split(',')[1],
            mimeType: file.type || 'image/jpeg'
          }
        },
        'Identify the food in this image and estimate its nutritional content for one typical serving. Return ONLY a valid JSON object with these exact fields: {"name": "food name in English", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number}. No markdown, no explanation, just JSON.'
      ])
      const text = response.response.text().trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        setResult({
          name: parsed.name || 'Unknown Food',
          calories: Math.round(parsed.calories || 0),
          protein_g: Math.round((parsed.protein_g || 0) * 10) / 10,
          carbs_g: Math.round((parsed.carbs_g || 0) * 10) / 10,
          fat_g: Math.round((parsed.fat_g || 0) * 10) / 10,
          fiber_g: Math.round((parsed.fiber_g || 0) * 10) / 10,
        })
      } else {
        setError('無法辨識食物，請重試或手動輸入。')
        setMode(null)
      }
    } catch (e) {
      setError('AI 辨識失敗：' + e.message)
      setMode(null)
    }
    setAnalyzing(false)
  }

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    const { error } = await supabase.from('meals').insert({
      user_id: session.user.id,
      name: result.name,
      meal_type: mealType,
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      fiber_g: result.fiber_g,
    })
    setSaving(false)
    if (!error) onSaved()
  }

  const updateResult = (k, v) => setResult(r => ({ ...r, [k]: v }))

  const reset = () => { setResult(null); setMode(null); setError('') }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-content">

          {/* Mode select */}
          {!mode && !result && (
            <>
              <h3 className="modal-title">掃描食物 📷</h3>
              {error && <p className="login-error" style={{ marginBottom: 12 }}>{error}</p>}
              <div className="scan-options">
                <button className="scan-option-btn" onClick={startBarcodeScan}>
                  <span className="scan-option-icon">📦</span>
                  <span className="scan-option-label">掃條碼</span>
                  <span className="scan-option-sub">包裝食品</span>
                </button>
                <button className="scan-option-btn" onClick={() => fileInputRef.current?.click()}>
                  <span className="scan-option-icon">🤖</span>
                  <span className="scan-option-label">AI 拍照</span>
                  <span className="scan-option-sub">任何食物</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={handlePhotoCapture} />
              <button className="signout-btn" style={{ marginTop: 0 }} onClick={onClose}>取消</button>
            </>
          )}

          {/* Barcode camera */}
          {mode === 'barcode' && scanning && (
            <>
              <h3 className="modal-title">對準條碼 📦</h3>
              <div className="scan-video-wrap">
                <video ref={videoRef} style={{ width: '100%', display: 'block' }} />
                <div className="scan-crosshair" />
              </div>
              <p className="scan-hint">自動掃描中...</p>
              <button className="signout-btn" style={{ marginTop: 12 }} onClick={() => {
                codeReaderRef.current?.reset()
                setScanning(false)
                setMode(null)
              }}>取消</button>
            </>
          )}

          {/* Analyzing */}
          {analyzing && (
            <>
              <h3 className="modal-title">分析中... 🔍</h3>
              <div className="scan-analyzing">
                <div className="scan-spinner">🤖</div>
                <p>正在取得營養資訊...</p>
              </div>
            </>
          )}

          {/* Results */}
          {result && !analyzing && (
            <>
              <h3 className="modal-title">確認餐點 ✅</h3>
              <div className="form-group">
                <label>餐點名稱</label>
                <input className="form-input" value={result.name} onChange={e => updateResult('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>餐別</label>
                <div className="meal-type-btns">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(t => (
                    <button key={t} type="button"
                      className={`meal-type-btn ${mealType === t ? 'active' : ''}`}
                      onClick={() => setMealType(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>卡路里 (kcal)</label>
                <input className="form-input" type="number" value={result.calories}
                  onChange={e => updateResult('calories', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>蛋白質 (g)</label>
                  <input className="form-input" type="number" value={result.protein_g}
                    onChange={e => updateResult('protein_g', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group half">
                  <label>碳水 (g)</label>
                  <input className="form-input" type="number" value={result.carbs_g}
                    onChange={e => updateResult('carbs_g', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>脂肪 (g)</label>
                  <input className="form-input" type="number" value={result.fat_g}
                    onChange={e => updateResult('fat_g', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group half">
                  <label>纖維 (g)</label>
                  <input className="form-input" type="number" value={result.fiber_g}
                    onChange={e => updateResult('fiber_g', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
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
