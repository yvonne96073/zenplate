import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CALORIE_GOAL = 2000
const MACRO_GOALS = { protein: 50, carbs: 250, fat: 65, fiber: 25 }

function MacroBar({ label, value, goal, unit, color }) {
  const pct = Math.min(Math.round((value / goal) * 100), 100)
  return (
    <div className="macro-bar">
      <div className="macro-bar-header">
        <span className="macro-label">{label}</span>
        <span className="macro-value">{Math.round(value)}{unit} / {goal}{unit}</span>
      </div>
      <div className="macro-track">
        <div className="macro-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function Stats({ session }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('meals')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        setMeals(data || [])
        setLoading(false)
      })
  }, [session])

  const total = {
    calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
    protein: meals.reduce((s, m) => s + (m.protein_g || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.carbs_g || 0), 0),
    fat: meals.reduce((s, m) => s + (m.fat_g || 0), 0),
    fiber: meals.reduce((s, m) => s + (m.fiber_g || 0), 0),
  }

  const calPct = Math.min(Math.round((total.calories / CALORIE_GOAL) * 100), 100)
  const ringBg = `conic-gradient(#2BB5A0 ${calPct}%, #C8D4EA 0)`

  const status = calPct >= 90 ? '🎯 On Target!' : calPct >= 50 ? '💪 Keep Going!' : '🌱 Just Starting'

  if (loading) return <p className="loading-text">Loading...</p>

  return (
    <>
      <h2 className="page-title">Today's Stats</h2>

      <div className="calorie-ring-wrap">
        <div className="calorie-ring" style={{ background: ringBg }}>
          <div className="calorie-ring-inner">
            <p className="ring-value">{total.calories}</p>
            <p className="ring-label">/ {CALORIE_GOAL} kcal</p>
          </div>
        </div>
        <p className="ring-status">{status}</p>
      </div>

      <div className="macro-section">
        <h3 className="section-title">Macronutrients</h3>
        <MacroBar label="Protein" value={total.protein} goal={MACRO_GOALS.protein} unit="g" color="#2BB5A0" />
        <MacroBar label="Carbs" value={total.carbs} goal={MACRO_GOALS.carbs} unit="g" color="#6C8EBD" />
        <MacroBar label="Fat" value={total.fat} goal={MACRO_GOALS.fat} unit="g" color="#F5A623" />
        <MacroBar label="Fiber" value={total.fiber} goal={MACRO_GOALS.fiber} unit="g" color="#8BC34A" />
      </div>

      <div className="section">
        <h3 className="section-title">Meals</h3>
        {meals.length === 0 ? (
          <p className="empty-text">No meals logged today yet</p>
        ) : (
          meals.map(meal => (
            <div key={meal.id} className="stats-meal-row">
              <p className="stats-meal-name">{meal.name}</p>
              <div className="stats-meal-macros">
                <span>P: {meal.protein_g || 0}g</span>
                <span>C: {meal.carbs_g || 0}g</span>
                <span>F: {meal.fat_g || 0}g</span>
                <span className="stats-meal-cal">{meal.calories} kcal</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
