import { useState } from 'react'
import { supabase } from '../lib/supabase'

const INITIAL = {
  name: '', meal_type: 'lunch',
  calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: ''
}

export default function LogMealModal({ session, onClose, onSaved }) {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Please enter a meal name'); return }
    if (!form.calories) { setError('Please enter calories'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.from('meals').insert({
      user_id: session.user.id,
      name: form.name.trim(),
      meal_type: form.meal_type,
      calories: parseInt(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      fiber_g: parseFloat(form.fiber_g) || 0,
    })

    setLoading(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-content">
          <h3 className="modal-title">Log a Meal 🥗</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Meal Name</label>
              <input
                className="form-input"
                placeholder="e.g. Chicken Rice, Salad..."
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Meal Type</label>
              <div className="meal-type-btns">
                {['breakfast', 'lunch', 'dinner', 'snack'].map(t => (
                  <button
                    type="button"
                    key={t}
                    className={`meal-type-btn ${form.meal_type === t ? 'active' : ''}`}
                    onClick={() => set('meal_type', t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Calories (kcal) *</label>
              <input
                className="form-input"
                type="number"
                placeholder="0"
                min="0"
                value={form.calories}
                onChange={e => set('calories', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Protein (g)</label>
                <input className="form-input" type="number" placeholder="0" min="0" value={form.protein_g} onChange={e => set('protein_g', e.target.value)} />
              </div>
              <div className="form-group half">
                <label>Carbs (g)</label>
                <input className="form-input" type="number" placeholder="0" min="0" value={form.carbs_g} onChange={e => set('carbs_g', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Fat (g)</label>
                <input className="form-input" type="number" placeholder="0" min="0" value={form.fat_g} onChange={e => set('fat_g', e.target.value)} />
              </div>
              <div className="form-group half">
                <label>Fiber (g)</label>
                <input className="form-input" type="number" placeholder="0" min="0" value={form.fiber_g} onChange={e => set('fiber_g', e.target.value)} />
              </div>
            </div>

            {error && <p className="login-error" style={{ marginBottom: 12 }}>{error}</p>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Saving...' : '✓ Log Meal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
