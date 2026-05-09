import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { calcPlateScore, scoreInfo } from '../utils/scoring'

const MEAL_TYPE_ZH    = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' }
const MEAL_TYPE_EMOJI = { breakfast: '🌅', lunch: '☀️',  dinner: '🌙',   snack: '🍿'  }

// ── Date helpers — use LOCAL time so "today" matches Taiwan clock ─────────────
function toLocalDateStr(d) {
  // Returns "YYYY-MM-DD" in the device's local timezone
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dy}`
}
function mealLocalDate(logged_at) {
  // Convert a UTC ISO timestamp to the local calendar date
  if (!logged_at) return ''
  return toLocalDateStr(new Date(logged_at))
}
function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return toLocalDateStr(d)
  })
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

// ── Macro bar ─────────────────────────────────────────────────────────────────
function MacroBar({ label, value, goal, unit, color }) {
  const pct = Math.min(Math.round((value / goal) * 100), 100)
  return (
    <div className="macro-bar">
      <div className="macro-bar-header">
        <span className="macro-label">{label}</span>
        <span className="macro-value">{Math.round(value)}{unit} / {goal}{unit}</span>
      </div>
      <div className="macro-track">
        <div className="macro-fill" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  )
}

// ── Week bar chart ────────────────────────────────────────────────────────────
function WeekChart({ weekData, calorieGoal }) {
  const maxCal = Math.max(...weekData.map(d => d.calories), calorieGoal)
  return (
    <div className="week-chart-wrap">
      <div className="week-chart">
        {weekData.map((d, i) => {
          const pct     = (d.calories / maxCal) * 100
          const atGoal  = d.calories >= calorieGoal * 0.8
          const isToday = i === weekData.length - 1
          return (
            <div key={i} className="week-bar-col">
              <div className="week-bar-cal">{d.calories > 0 ? d.calories : ''}</div>
              <div className="week-bar-bg">
                <div className="week-bar-fill" style={{
                  height:      `${Math.max(pct, d.calories > 0 ? 4 : 0)}%`,
                  background:  isToday ? 'var(--primary)' : atGoal ? 'var(--primary-light)' : 'var(--border)',
                  borderColor: isToday ? 'var(--primary-dark)' : 'transparent',
                }}/>
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

// ── Inline day detail (meals list) ────────────────────────────────────────────
function DayDetail({ meals }) {
  const sorted    = [...meals].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
  const totalCal  = meals.reduce((s, m) => s + (m.calories  || 0), 0)
  const totalPro  = meals.reduce((s, m) => s + (m.protein_g || 0), 0)
  const totalCarb = meals.reduce((s, m) => s + (m.carbs_g   || 0), 0)
  const avgScore  = meals.length > 0
    ? Math.round(meals.reduce((s, m) => s + calcPlateScore(m), 0) / meals.length) : 0
  const si = avgScore > 0 ? scoreInfo(avgScore) : null

  return (
    <div className="stats-day-detail">
      {/* Summary chips — score first, no calories */}
      <div className="dd-summary-row">
        {si && (
          <span className="dd-chip" style={{ background: si.bg, color: si.color, borderColor: 'transparent' }}>
            🏅 Plate Score <strong>{avgScore}</strong>
          </span>
        )}
        <span className="dd-chip">💪 蛋白 <strong>{Math.round(totalPro)}g</strong></span>
        <span className="dd-chip">🌾 碳水 <strong>{Math.round(totalCarb)}g</strong></span>
      </div>

      {/* Meal cards */}
      {sorted.map(meal => {
        const score = calcPlateScore(meal)
        const msi   = scoreInfo(score)
        return (
          <div key={meal.id} className="dd-meal-card">
            <div className="dd-meal-top">
              <span className="dd-meal-type">
                {MEAL_TYPE_EMOJI[meal.meal_type] || '🍽️'}&nbsp;{MEAL_TYPE_ZH[meal.meal_type] || meal.meal_type}
              </span>
              <span className="dd-meal-time">{formatTime(meal.logged_at)}</span>
              <span className="dd-meal-score" style={{ background: msi.bg, color: msi.color }}>
                {score}
              </span>
            </div>
            <p className="dd-meal-name">{meal.name}</p>
            <div className="dd-meal-macros">
              <span className="dd-macro-cal">🔥 {meal.calories ?? 0} kcal</span>
              <span>蛋白 {meal.protein_g ?? 0}g</span>
              <span>碳水 {meal.carbs_g ?? 0}g</span>
              <span>脂肪 {meal.fat_g ?? 0}g</span>
              {(meal.fiber_g || 0) > 0 && <span>纖維 {meal.fiber_g}g</span>}
            </div>
            {meal.data_source && <p className="dd-meal-source">來源：{meal.data_source}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ── Monthly calendar ──────────────────────────────────────────────────────────
function MonthCalendar({ allMeals }) {
  const [viewDate,     setViewDate]     = useState(() => new Date())
  const [expandedDate, setExpandedDate] = useState(null)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Group meals by UTC date
  const mealsByDate = {}
  allMeals.forEach(m => {
    const d = mealLocalDate(m.logged_at)
    if (d) {
      if (!mealsByDate[d]) mealsByDate[d] = []
      mealsByDate[d].push(m)
    }
  })

  const today        = toLocalDateStr(new Date())
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()  // 0=Sun
  const monthLabel   = viewDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })

  const cells = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day     = i + 1
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return { day, dateStr, meals: mealsByDate[dateStr] || [] }
    }),
  ]

  const goMonth = delta => setViewDate(d => {
    const nd = new Date(d.getFullYear(), d.getMonth() + delta, 1)
    return nd
  })

  const toggle = dateStr => setExpandedDate(prev => prev === dateStr ? null : dateStr)

  return (
    <div className="cal-wrap">
      {/* Month navigation */}
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={() => goMonth(-1)}>‹</button>
        <span className="cal-month-label">{monthLabel}</span>
        <button className="cal-nav-btn" onClick={() => goMonth(1)}>›</button>
      </div>

      {/* Weekday headers */}
      <div className="cal-weekdays">
        {['日','一','二','三','四','五','六'].map(d => (
          <span key={d} className="cal-weekday">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal-grid">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="cal-cell empty"/>
          const hasMeals   = cell.meals.length > 0
          const isToday    = cell.dateStr === today
          const isSelected = cell.dateStr === expandedDate
          return (
            <div key={i}
              className={`cal-cell ${hasMeals ? 'has-data' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => hasMeals && toggle(cell.dateStr)}
            >
              <span className="cal-day-num">{cell.day}</span>
              {hasMeals && <span className="cal-dot">{cell.meals.length}</span>}
            </div>
          )
        })}
      </div>

      {/* Inline meal detail below calendar */}
      {expandedDate && mealsByDate[expandedDate]?.length > 0 && (
        <>
          <div className="cal-detail-header">
            {new Date(expandedDate + 'T12:00:00').toLocaleDateString('zh-TW', {
              month: 'long', day: 'numeric', weekday: 'short',
            })}
            <button className="cal-detail-close" onClick={() => setExpandedDate(null)}>✕</button>
          </div>
          <DayDetail meals={mealsByDate[expandedDate]} />
        </>
      )}
    </div>
  )
}

// ── Cat Coach insight engine ──────────────────────────────────────────────────
const FRIED_PAT  = /炸|排骨|雞排|薯條|鍋貼|春捲|甜甜圈|fried|burger|fries|nugget|crispy|donut/i
const SWEET_PAT  = /奶茶|珍奶|手搖|可樂|汽水|蛋糕|布丁|冰淇淋|巧克力|糖|甜點|bubble.?tea|boba|soda|cake|dessert|cookie|candy/i
const VEGGIE_PAT = /青菜|燙青菜|沙拉|蔬菜|花椰菜|菠菜|高麗菜|番茄|玉米|地瓜|salad|vegetable|broccoli|spinach|greens/i

function generateInsights(meals) {
  if (meals.length === 0) return []

  const n = meals.length

  const avgProtein = meals.reduce((s, m) => s + (m.protein_g || 0), 0) / n
  const avgCarbs   = meals.reduce((s, m) => s + (m.carbs_g   || 0), 0) / n
  const avgFiber   = meals.reduce((s, m) => s + (m.fiber_g   || 0), 0) / n

  const friedPct  = meals.filter(m => FRIED_PAT.test(m.name  || '')).length / n
  const sweetPct  = meals.filter(m => SWEET_PAT.test(m.name  || '')).length / n
  const veggiePct = meals.filter(m => VEGGIE_PAT.test(m.name || '')).length / n

  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i)); return toLocalDateStr(d)
  })
  const daysLogged = days14.filter(date =>
    meals.some(m => mealLocalDate(m.logged_at) === date)
  ).length

  const insights = []

  if (avgProtein < 15) {
    insights.push({
      key: 'low_protein',
      message: "Looks like we haven't had much protein lately 👀",
      nudge: 'Maybe try adding a little tomorrow:',
      foods: ['Tea egg', 'Soy milk', 'Tofu', 'Grilled chicken'],
      close: 'Small steps are enough 🐱',
      btn: "I'll try tomorrow 🌙",
    })
  }

  if (avgCarbs > 50 && avgProtein < 20 && avgCarbs / Math.max(avgProtein, 1) > 3) {
    insights.push({
      key: 'carb_heavy',
      message: "You've been eating a lot of comforting carbs lately 🍜",
      nudge: 'Maybe tomorrow, add a little protein alongside:',
      foods: ['Tea egg', 'Soy milk', 'Tofu', 'Boiled egg'],
      close: '',
      btn: "I'll try tomorrow 🌙",
    })
  }

  if (friedPct >= 0.3) {
    insights.push({
      key: 'fried_food',
      message: "Looks like there's been quite a bit of fried food lately 🍤",
      nudge: 'Maybe try something a little lighter tomorrow:',
      foods: ['Steamed greens', 'Fruit', 'Soup'],
      close: '',
      btn: "I'll try tomorrow 🌙",
    })
  }

  if (sweetPct >= 0.25) {
    insights.push({
      key: 'sweet',
      message: "There's been a few sweet drinks in the mix lately 🧋",
      nudge: 'Maybe swap one for something plain tomorrow:',
      foods: ['Green tea', 'Plain water', 'Soy milk'],
      close: '',
      btn: "I'll try tomorrow 🌙",
    })
  }

  if (avgFiber < 3 && veggiePct < 0.2) {
    insights.push({
      key: 'low_veggies',
      message: "Hmm, vegetables have been a little quiet lately 🥦",
      nudge: 'Even one small side helps a lot:',
      foods: ['Steamed greens', 'Sweet potato', 'Corn', 'Fruit'],
      close: '',
      btn: "I'll try tomorrow 🌙",
    })
  }

  if (daysLogged >= 8) {
    insights.push({
      key: 'consistent',
      message: "You've been doing a good job logging meals lately 🌟",
      nudge: 'Your balance is slowly improving 🐱',
      foods: [],
      close: '',
      btn: 'Got it 🐱',
    })
  }

  if (avgProtein >= 18 && avgFiber >= 4 && !insights.find(i => i.key === 'consistent')) {
    insights.push({
      key: 'good_balance',
      message: "Everything's looking pretty balanced lately 🌿",
      nudge: 'Keep it up 🐱',
      foods: [],
      close: '',
      btn: 'Got it 🐱',
    })
  }

  return insights
}

// ── Cat Coach card ────────────────────────────────────────────────────────────
function CatCoach({ allMeals, profile }) {
  const [seen, setSeen] = useState([])

  const days14Start = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 13); return toLocalDateStr(d)
  }, [])

  const recentMeals = useMemo(
    () => allMeals.filter(m => mealLocalDate(m.logged_at) >= days14Start),
    [allMeals, days14Start]
  )

  const insights = useMemo(
    () => generateInsights(recentMeals, profile),
    [recentMeals, profile]
  )

  const insight = insights.find(i => !seen.includes(i.key))

  const dismiss = () => {
    if (insight) setSeen(prev => [...prev, insight.key])
  }

  return (
    <div className="section">
      <h3 className="section-title">Cat Coach 🐱</h3>

      {insights.length === 0 ? (
        <div className="cat-coach-card">
          <p className="cc-message">Log a few meals and your companion will gently check in 🌿</p>
        </div>

      ) : !insight ? (
        <div className="cat-coach-card">
          <p className="cc-message">All caught up for now 🎉</p>
          <p className="cc-sub">Keep logging and your companion will check back soon 🐱</p>
        </div>

      ) : (
        <div className="cat-coach-card">
          <p className="cc-message">{insight.message}</p>
          {insight.foods.length > 0 ? (
            <>
              <p className="cc-nudge">{insight.nudge}</p>
              <div className="cc-foods">
                {insight.foods.map(f => <span key={f} className="cc-food-chip">{f}</span>)}
              </div>
              {insight.close && <p className="cc-close">{insight.close}</p>}
            </>
          ) : (
            <p className="cc-nudge">{insight.nudge}</p>
          )}
          <button className="cc-btn" onClick={dismiss}>{insight.btn}</button>
        </div>
      )}
    </div>
  )
}

// ── Main Stats ────────────────────────────────────────────────────────────────
export default function Stats({ session, profile }) {
  const [tab,        setTab]        = useState('today')
  const [todayMeals, setTodayMeals] = useState([])
  const [weekMeals,  setWeekMeals]  = useState([])
  const [allMeals,   setAllMeals]   = useState([])   // 60 days for calendar
  const [loading,    setLoading]    = useState(true)

  const calorieGoal = profile?.calorie_goal || 2000
  const proteinGoal = profile?.protein_goal || 60
  const MACRO_GOALS = { carbs: 250, fat: 65, fiber: 25 }

  useEffect(() => {
    const today     = toLocalDateStr(new Date())
    const weekStart = getLast7Days()[0]

    // Query 62 days back — extra buffer so UTC midnight meals (logged before 8 AM
    // Taiwan time) are never cut off by the query boundary
    const dFrom = new Date()
    dFrom.setDate(dFrom.getDate() - 62)
    // Go one extra UTC day back to catch any timezone-shifted records
    dFrom.setDate(dFrom.getDate() - 1)
    const fromStr = dFrom.toISOString().split('T')[0]

    supabase
      .from('meals').select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${fromStr}T00:00:00`)
      .order('logged_at', { ascending: true })
      .then(({ data }) => {
        const all = data || []
        setAllMeals(all)
        setTodayMeals(all.filter(m => mealLocalDate(m.logged_at) === today))
        setWeekMeals(all.filter(m => mealLocalDate(m.logged_at) >= weekStart))
        setLoading(false)
      })
  }, [session])

  // ── Today totals ──────────────────────────────────────────────────────────
  const total = {
    calories: todayMeals.reduce((s, m) => s + (m.calories  || 0), 0),
    protein:  todayMeals.reduce((s, m) => s + (m.protein_g || 0), 0),
    carbs:    todayMeals.reduce((s, m) => s + (m.carbs_g   || 0), 0),
    fat:      todayMeals.reduce((s, m) => s + (m.fat_g     || 0), 0),
    fiber:    todayMeals.reduce((s, m) => s + (m.fiber_g   || 0), 0),
  }
  const calPct = Math.min(Math.round((total.calories / calorieGoal) * 100), 100)
  const ringBg = `conic-gradient(var(--primary) ${calPct * 3.6}deg, var(--border) 0)`
  const status = calPct >= 90 ? '🎯 On Target!' : calPct >= 50 ? '💪 Keep Going!' : '🌱 Just Starting'
  const todayAvgScore = todayMeals.length > 0
    ? Math.round(todayMeals.reduce((s, m) => s + calcPlateScore(m), 0) / todayMeals.length) : 0

  // ── Week summary ──────────────────────────────────────────────────────────
  const days7     = getLast7Days()
  const shortDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const weekData  = days7.map(date => {
    const dm = weekMeals.filter(m => mealLocalDate(m.logged_at) === date)
    return {
      date,
      calories: Math.round(dm.reduce((s, m) => s + (m.calories  || 0), 0)),
      protein:  Math.round(dm.reduce((s, m) => s + (m.protein_g || 0), 0)),
      day: shortDays[new Date(date + 'T12:00:00').getDay()],
    }
  })

  const daysLogged   = weekData.filter(d => d.calories > 0).length
  const avgCalories  = daysLogged > 0 ? Math.round(weekData.reduce((s, d) => s + d.calories, 0) / daysLogged) : 0
  const avgProtein   = daysLogged > 0 ? Math.round(weekData.reduce((s, d) => s + d.protein,  0) / daysLogged) : 0
  const weekAvgScore = weekMeals.length > 0
    ? Math.round(weekMeals.reduce((s, m) => s + calcPlateScore(m), 0) / weekMeals.length) : 0

  if (loading) return <p className="loading-text">Loading...</p>

  return (
    <>
      <h2 className="page-title">Stats</h2>

      <div className="stats-tabs">
        <button className={`stats-tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
        <button className={`stats-tab ${tab === 'week'  ? 'active' : ''}`} onClick={() => setTab('week')}>This Week</button>
      </div>

      {/* ── Today ── */}
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
              <div className="plate-score-badge"
                style={{ background: scoreInfo(todayAvgScore).bg, color: scoreInfo(todayAvgScore).color }}>
                Avg Plate Score: <strong>{todayAvgScore}</strong> · {scoreInfo(todayAvgScore).label}
              </div>
            )}
          </div>

          <div className="macro-section">
            <h3 className="section-title">Macronutrients</h3>
            <MacroBar label="🔥 Calories" value={total.calories} goal={calorieGoal}       unit=" kcal" color="#E65100"/>
            <MacroBar label="💪 Protein"  value={total.protein}  goal={proteinGoal}        unit="g"    color="#2BB5A0"/>
            <MacroBar label="🌾 Carbs"    value={total.carbs}    goal={MACRO_GOALS.carbs}  unit="g"    color="#6C8EBD"/>
            <MacroBar label="🧈 Fat"      value={total.fat}      goal={MACRO_GOALS.fat}    unit="g"    color="#F5A623"/>
            <MacroBar label="🌿 Fiber"    value={total.fiber}    goal={MACRO_GOALS.fiber}  unit="g"    color="#8BC34A"/>
          </div>

          <div className="section">
            <h3 className="section-title">Meals</h3>
            {todayMeals.length === 0
              ? <p className="empty-text">No meals logged today yet</p>
              : todayMeals.map(meal => {
                  const score = calcPlateScore(meal)
                  const si    = scoreInfo(score)
                  return (
                    <div key={meal.id} className="stats-meal-row">
                      <div>
                        <p className="stats-meal-name">{meal.name}</p>
                        <p className="stats-meal-meta">
                          {MEAL_TYPE_EMOJI[meal.meal_type]}&nbsp;
                          {MEAL_TYPE_ZH[meal.meal_type] || meal.meal_type}
                          &nbsp;·&nbsp;{formatTime(meal.logged_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="meal-score"
                          style={{ background: si.bg, color: si.color, marginBottom: 3 }}>
                          {score}
                        </div>
                        <span className="stats-meal-cal">{meal.calories} kcal</span>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </>
      )}

      {/* ── This Week ── */}
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
              <p className="week-card-value"
                style={{ color: weekAvgScore >= 75 ? 'var(--primary)' : 'var(--dark)' }}>
                {weekAvgScore || '-'}
              </p>
              <p className="week-card-label">Avg Score</p>
            </div>
          </div>

          {/* Monthly calendar — tap any day to see meals */}
          <div className="section">
            <h3 className="section-title">Monthly Overview</h3>
            <MonthCalendar allMeals={allMeals} />
          </div>

          {/* Cat Coach */}
          <CatCoach allMeals={allMeals} profile={profile} />
        </>
      )}
    </>
  )
}
