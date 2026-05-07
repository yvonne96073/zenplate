import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { calcPlateScore, scoreInfo } from '../utils/scoring'

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

function WeekChart({ weekData, calorieGoal }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxCal = Math.max(...weekData.map(d => d.calories), calorieGoal)

  return (
    <div className="week-chart-wrap">
      <div className="week-chart">
        {weekData.map((d, i) => {
          const pct = (d.calories / maxCal) * 100
          const atGoal = d.calories >= calorieGoal * 0.8
          const isToday = i === weekData.length - 1
          return (
            <div key={i} className="week-bar-col">
              <div className="week-bar-cal">{d.calories > 0 ? d.calories : ''}</div>
              <div className="week-bar-bg">
                <div
                  className="week-bar-fill"
                  style={{
                    height: `${Math.max(pct, d.calories > 0 ? 4 : 0)}%`,
                    background: isToday ? 'var(--primary)' : atGoal ? 'var(--primary-light)' : 'var(--border)',
                    borderColor: isToday ? 'var(--primary-dark)' : 'transparent',
                  }}
                />
              </div>
              <div className={`week-bar-label ${isToday ? 'today' : ''}`}>{d.day}</div>
            </div>
          )
        })}
      </div>
      <div className="week-goal-line" style={{ bottom: `${(calorieGoal / maxCal) * 100}%` }}>
        <span className="week-goal-tag">goal</span>
      </div>
    </div>
  )
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export default function Stats({ session, profile }) {
  const [tab, setTab] = useState('today')
  const [todayMeals, setTodayMeals] = useState([])
  const [weekMeals, setWeekMeals] = useState([])
  const [loading, setLoading] = useState(true)

  const calorieGoal = profile?.calorie_goal || 2000
  const proteinGoal = profile?.protein_goal || 60
  const MACRO_GOALS = { carbs: 250, fat: 65, fiber: 25 }

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = getLast7Days()[0]

    supabase
      .from('meals').select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${sevenDaysAgo}T00:00:00`)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        const all = data || []
        setTodayMeals(all.filter(m => m.logged_at?.startsWith(today)))
        setWeekMeals(all)
        setLoading(false)
      })
  }, [session])

  const total = {
    calories: todayMeals.reduce((s, m) => s + (m.calories || 0), 0),
    protein: todayMeals.reduce((s, m) => s + (m.protein_g || 0), 0),
    carbs: todayMeals.reduce((s, m) => s + (m.carbs_g || 0), 0),
    fat: todayMeals.reduce((s, m) => s + (m.fat_g || 0), 0),
    fiber: todayMeals.reduce((s, m) => s + (m.fiber_g || 0), 0),
  }

  const calPct = Math.min(Math.round((total.calories / calorieGoal) * 100), 100)
  const ringBg = `conic-gradient(var(--primary) ${calPct * 3.6}deg, var(--border) 0)`
  const status = calPct >= 90 ? '🎯 On Target!' : calPct >= 50 ? '💪 Keep Going!' : '🌱 Just Starting'

  // Week data
  const days7 = getLast7Days()
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekData = days7.map(date => {
    const dayMeals = weekMeals.filter(m => m.logged_at?.startsWith(date))
    const calories = Math.round(dayMeals.reduce((s, m) => s + (m.calories || 0), 0))
    const protein = Math.round(dayMeals.reduce((s, m) => s + (m.protein_g || 0), 0))
    return { date, calories, protein, day: shortDays[new Date(date + 'T12:00:00').getDay()] }
  })

  const daysLogged = weekData.filter(d => d.calories > 0).length
  const avgCalories = daysLogged > 0 ? Math.round(weekData.reduce((s, d) => s + d.calories, 0) / daysLogged) : 0
  const avgProtein = daysLogged > 0 ? Math.round(weekData.reduce((s, d) => s + d.protein, 0) / daysLogged) : 0

  const todayAvgScore = todayMeals.length > 0
    ? Math.round(todayMeals.reduce((s, m) => s + calcPlateScore(m), 0) / todayMeals.length) : 0
  const weekAvgScore = weekMeals.length > 0
    ? Math.round(weekMeals.reduce((s, m) => s + calcPlateScore(m), 0) / weekMeals.length) : 0

  if (loading) return <p className="loading-text">Loading...</p>

  return (
    <>
      <h2 className="page-title">Stats</h2>

      {/* Tab switcher */}
      <div className="stats-tabs">
        <button className={`stats-tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
        <button className={`stats-tab ${tab === 'week' ? 'active' : ''}`} onClick={() => setTab('week')}>This Week</button>
      </div>

      {tab === 'today' && (
        <>
          <div className="calorie-ring-wrap">
            <div className="calorie-ring" style={{ background: ringBg }}>
              <div className="calorie-ring-inner">
                <p className="ring-value">{total.calories}</p>
                <p className="ring-label">/ {calorieGoal} kcal</p>
              </div>
            </div>
            <p className="ring-status">{status}</p>
            {todayAvgScore > 0 && (
              <div className="plate-score-badge" style={{ background: scoreInfo(todayAvgScore).bg, color: scoreInfo(todayAvgScore).color }}>
                Avg Plate Score: <strong>{todayAvgScore}</strong> · {scoreInfo(todayAvgScore).label}
              </div>
            )}
          </div>

          <div className="macro-section">
            <h3 className="section-title">Macronutrients</h3>
            <MacroBar label="🔥 Calories" value={total.calories} goal={calorieGoal} unit=" kcal" color="#E65100" />
            <MacroBar label="💪 Protein" value={total.protein} goal={proteinGoal} unit="g" color="#2BB5A0" />
            <MacroBar label="🌾 Carbs" value={total.carbs} goal={MACRO_GOALS.carbs} unit="g" color="#6C8EBD" />
            <MacroBar label="🧈 Fat" value={total.fat} goal={MACRO_GOALS.fat} unit="g" color="#F5A623" />
            <MacroBar label="🌿 Fiber" value={total.fiber} goal={MACRO_GOALS.fiber} unit="g" color="#8BC34A" />
          </div>

          <div className="section">
            <h3 className="section-title">Meals</h3>
            {todayMeals.length === 0 ? (
              <p className="empty-text">No meals logged today yet</p>
            ) : (
              todayMeals.map(meal => (
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
      )}

      {tab === 'week' && (
        <>
          <div className="week-summary-cards">
            <div className="week-summary-card">
              <p className="week-card-value">{daysLogged}</p>
              <p className="week-card-label">Days Logged</p>
            </div>
            <div className="week-summary-card">
              <p className="week-card-value">{avgCalories}</p>
              <p className="week-card-label">Avg Cal</p>
            </div>
            <div className="week-summary-card">
              <p className="week-card-value">{avgProtein}g</p>
              <p className="week-card-label">Avg Protein</p>
            </div>
            <div className="week-summary-card">
              <p className="week-card-value" style={{ color: weekAvgScore >= 75 ? 'var(--primary)' : 'var(--dark)' }}>
                {weekAvgScore || '-'}
              </p>
              <p className="week-card-label">Avg Score</p>
            </div>
          </div>

          <div className="section">
            <h3 className="section-title">Calories This Week</h3>
            <WeekChart weekData={weekData} calorieGoal={calorieGoal} />
          </div>

          <div className="section">
            <h3 className="section-title">Daily Breakdown</h3>
            {weekData.filter(d => d.calories > 0).reverse().map(d => (
              <div key={d.date} className="stats-meal-row">
                <p className="stats-meal-name">{d.day} <span style={{ color: 'var(--muted)', fontSize: 12 }}>{d.date}</span></p>
                <div className="stats-meal-macros">
                  <span>P: {d.protein}g</span>
                  <span className="stats-meal-cal">{d.calories} kcal</span>
                </div>
              </div>
            ))}
            {daysLogged === 0 && <p className="empty-text">No meals logged this week yet</p>}
          </div>
        </>
      )}
    </>
  )
}
