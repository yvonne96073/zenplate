import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getLevel, getLevelXp, getNextLevelXp } from '../hooks/useProfile'
import { calcPlateScore, scoreInfo } from '../utils/scoring'

const MEAL_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' }
const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  return 'Evening'
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function DailyQuests({ meals, profile }) {
  if (!profile) return null

  const todayProtein = meals.reduce((s, m) => s + (m.protein_g || 0), 0)
  const todayCalories = meals.reduce((s, m) => s + (m.calories || 0), 0)
  const mealCount = meals.length
  const calorieGoal = profile.calorie_goal || 2000
  const proteinGoal = profile.protein_goal || 60

  const quests = [
    {
      icon: '🍽️',
      title: 'Log 3 meals today',
      progress: Math.min(mealCount, 3),
      total: 3,
      xp: 30,
      done: mealCount >= 3,
    },
    {
      icon: '💪',
      title: `Hit protein goal (${proteinGoal}g)`,
      progress: Math.round(todayProtein),
      total: proteinGoal,
      xp: 40,
      done: todayProtein >= proteinGoal,
    },
    {
      icon: '🔥',
      title: `Hit calorie goal (${calorieGoal} kcal)`,
      progress: todayCalories,
      total: calorieGoal,
      xp: 50,
      done: todayCalories >= calorieGoal,
    },
  ]

  return (
    <div className="section">
      <h3 className="section-title">Daily Quests</h3>
      {quests.map((q, i) => (
        <div key={i} className={`quest-card ${q.done ? 'done' : ''}`}>
          <span className="quest-icon">{q.done ? '✅' : q.icon}</span>
          <div className="quest-info">
            <p className="quest-title">{q.title}</p>
            <div className="quest-bar-wrap">
              <div className="quest-bar" style={{ width: `${Math.min((q.progress / q.total) * 100, 100)}%` }} />
            </div>
            <p className="quest-sub">{q.progress} / {q.total}</p>
          </div>
          <span className="quest-xp">+{q.xp} XP</span>
        </div>
      ))}
    </div>
  )
}

const DICEBEAR = (seed) => `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=2BB5A0&textColor=ffffff&fontSize=40`

function HomeAvatar({ profile }) {
  const seed = profile?.avatar || 'Felix'
  return (
    <img
      src={DICEBEAR(seed)}
      alt="avatar"
      className="home-avatar-img"
    />
  )
}

export default function Home({ session, profile, onLogMeal }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchTodayMeals() }, [session])

  const fetchTodayMeals = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meals').select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true })
    setMeals(data || [])
    setLoading(false)
  }

  const handleDeleteMeal = async (id) => {
    await supabase.from('meals').delete().eq('id', id)
    setMeals(prev => prev.filter(m => m.id !== id))
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0)
  const calorieGoal = profile?.calorie_goal || 2000
  const loggedTypes = meals.map(m => m.meal_type)
  const missingTypes = ALL_MEAL_TYPES.filter(t => !loggedTypes.includes(t))
  const username = session.user.user_metadata?.full_name?.split(' ')[0] || session.user.email?.split('@')[0]

  const level = profile ? getLevel(profile.xp || 0) : 1
  const currentXp = profile?.xp || 0
  const levelStart = getLevelXp(level)
  const levelEnd = getNextLevelXp(level)
  const xpPct = Math.round(((currentXp - levelStart) / (levelEnd - levelStart)) * 100)

  return (
    <>
      <div className="home-header">
        <HomeAvatar profile={profile} />
        <div style={{ flex: 1 }}>
          <h2 className="home-greeting">Good {getTimeOfDay()}, {username}!</h2>
          {profile && (
            <div className="xp-bar-wrap">
              <div className="xp-bar-label">
                <span>Lv.{level}</span>
                <span>{currentXp} / {levelEnd} XP</span>
              </div>
              <div className="xp-bar-bg">
                <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <p className="summary-label">Calories Today</p>
          <p className="summary-value">{totalCalories}</p>
          <p className="summary-sub">/ {calorieGoal} kcal</p>
        </div>
        <div className="summary-card accent">
          <p className="summary-label">Meals Logged</p>
          <p className="summary-value">{meals.length}</p>
          <p className="summary-sub">of 3 today</p>
        </div>
      </div>

      <DailyQuests meals={meals} profile={profile} />

      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Today's Journal</h3>
        </div>
        {loading ? <p className="loading-text">Loading...</p> : (
          <>
            {meals.map(meal => {
              const score = calcPlateScore(meal)
              const info = scoreInfo(score)
              return (
                <div key={meal.id} className="meal-card">
                  <span className="meal-emoji">{MEAL_EMOJIS[meal.meal_type] || '🍽️'}</span>
                  <div className="meal-info">
                    <p className="meal-name">{meal.name}</p>
                    <p className="meal-meta">{formatTime(meal.logged_at)} · {meal.meal_type}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="meal-score" style={{ background: info.bg, color: info.color }}>{score} pts</div>
                    <span className="meal-calories">{meal.calories} kcal</span>
                  </div>
                  <button className="meal-delete-btn" onClick={() => handleDeleteMeal(meal.id)}>✕</button>
                </div>
              )
            })}
            {missingTypes.map(type => (
              <div key={type} className="meal-card placeholder" onClick={onLogMeal}>
                <span className="meal-emoji">➕</span>
                <div className="meal-info">
                  <p className="meal-name">Log {type.charAt(0).toUpperCase() + type.slice(1)}</p>
                  <p className="meal-meta">Tap to add</p>
                </div>
              </div>
            ))}
            {meals.length === 0 && <p className="empty-text">No meals logged today. Tap + to start! 🥗</p>}
          </>
        )}
      </div>
    </>
  )
}
