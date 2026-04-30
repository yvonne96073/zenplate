import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MEAL_EMOJIS = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

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

export default function Home({ session, onLogMeal }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayMeals()
  }, [session])

  const fetchTodayMeals = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true })
    setMeals(data || [])
    setLoading(false)
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0)
  const loggedTypes = meals.map(m => m.meal_type)
  const missingTypes = ALL_MEAL_TYPES.filter(t => !loggedTypes.includes(t))
  const username = session.user.email?.split('@')[0]

  return (
    <>
      <div className="home-header">
        <div className="home-avatar">🌿</div>
        <div>
          <h2 className="home-greeting">Good {getTimeOfDay()}, {username}!</h2>
          <p className="home-username">Let's track your meals today</p>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <p className="summary-label">Calories Today</p>
          <p className="summary-value">{totalCalories}</p>
          <p className="summary-sub">kcal</p>
        </div>
        <div className="summary-card accent">
          <p className="summary-label">Meals Logged</p>
          <p className="summary-value">{meals.length}</p>
          <p className="summary-sub">of 3 today</p>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h3 className="section-title">Today's Journal</h3>
        </div>

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <>
            {meals.map(meal => (
              <div key={meal.id} className="meal-card">
                <span className="meal-emoji">{MEAL_EMOJIS[meal.meal_type] || '🍽️'}</span>
                <div className="meal-info">
                  <p className="meal-name">{meal.name}</p>
                  <p className="meal-meta">
                    {formatTime(meal.logged_at)} · {meal.meal_type}
                  </p>
                </div>
                <span className="meal-calories">{meal.calories} kcal</span>
              </div>
            ))}

            {missingTypes.map(type => (
              <div key={type} className="meal-card placeholder" onClick={onLogMeal}>
                <span className="meal-emoji">➕</span>
                <div className="meal-info">
                  <p className="meal-name">Log {type.charAt(0).toUpperCase() + type.slice(1)}</p>
                  <p className="meal-meta">Tap to add</p>
                </div>
              </div>
            ))}

            {meals.length === 0 && (
              <p className="empty-text">No meals logged today. Tap + to start! 🥗</p>
            )}
          </>
        )}
      </div>
    </>
  )
}
