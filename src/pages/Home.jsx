import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getLevel, getLevelXp, getNextLevelXp } from '../hooks/useProfile'
import { calcPlateScore, scoreInfo } from '../utils/scoring'

const MEAL_EMOJIS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' }
const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner']

const FOOD_EMOJI_MAP = [
  // 穀物 / 澱粉
  [/飯|白飯|炒飯|米飯|糙米|粥/, '🍚'],
  [/麵|拉麵|泡麵|烏龍|義大利麵|冬粉|河粉|米粉/, '🍜'],
  [/麵包|吐司|貝果|可頌/, '🍞'],
  [/饅頭|包子|水餃|餃子|鍋貼|湯包|小籠包/, '🥟'],
  [/披薩|pizza/i, '🍕'],
  [/漢堡|burger/i, '🍔'],
  [/三明治|sandwich/i, '🥪'],
  [/薯條|薯片/, '🍟'],
  // 餅乾 / 點心
  [/餅乾|薄餅|餅|蘇打|小泡芙|泡芙|威化|夾心|乖乖|洋芋片/, '🍪'],
  [/蛋糕|起司蛋糕|布朗尼/, '🎂'],
  [/巧克力|chocolate/i, '🍫'],
  [/糖果|軟糖|棒棒糖/, '🍬'],
  [/冰淇淋|霜淇淋|雪糕|冰/, '🍦'],
  [/布丁|果凍|仙草|愛玉/, '🍮'],
  [/甜甜圈|donut/i, '🍩'],
  // 蛋白質
  [/雞|烤雞|炸雞|雞腿|雞胸|雞翅/, '🍗'],
  [/牛肉|牛排|漢堡排/, '🥩'],
  [/豬|排骨|豬腳|培根|火腿/, '🥓'],
  [/魚|鮭魚|鮪魚|鱸魚|秋刀魚|鯖魚/, '🐟'],
  [/蝦|海鮮|螃蟹|透抽|花枝/, '🦐'],
  [/蛋|荷包蛋|炒蛋|茶葉蛋/, '🥚'],
  [/豆腐|豆漿/, '🧈'],
  // 蔬菜 / 沙拉
  [/沙拉|生菜|萵苣/, '🥗'],
  [/蔬菜|青菜|花椰菜|菠菜|高麗菜|空心菜/, '🥦'],
  [/番茄|西紅柿/, '🍅'],
  [/玉米/, '🌽'],
  [/地瓜|番薯|馬鈴薯/, '🍠'],
  // 水果
  [/蘋果/, '🍎'],
  [/香蕉/, '🍌'],
  [/橘子|柳橙|橙/, '🍊'],
  [/葡萄/, '🍇'],
  [/西瓜/, '🍉'],
  [/草莓/, '🍓'],
  [/水果/, '🍑'],
  // 湯 / 鍋
  [/湯|火鍋|麻辣鍋|滷/, '🍲'],
  [/咖哩|curry/i, '🍛'],
  [/壽司|生魚片|握壽司/, '🍣'],
  [/便當|定食/, '🍱'],
  // 飲料
  [/牛奶|鮮乳|奶|拿鐵|豆漿/, '🥛'],
  [/咖啡|coffee/i, '☕'],
  [/茶|綠茶|紅茶|烏龍茶/, '🍵'],
  [/可樂|沙士|汽水|果汁|飲料/, '🥤'],
  [/啤酒|酒/, '🍺'],
]

function getFoodEmoji(name = '', mealType = '') {
  const n = name.toLowerCase()
  for (const [pattern, emoji] of FOOD_EMOJI_MAP) {
    if (pattern.test(n)) return emoji
  }
  return MEAL_EMOJIS[mealType] || '🍽️'
}

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
      desc: 'Each meal earns 1 🌿 Care Energy for your cat',
      progress: Math.min(mealCount, 3),
      total: 3,
      xp: 30,
      done: mealCount >= 3,
    },
    {
      icon: '💪',
      title: `Hit protein goal (${proteinGoal}g)`,
      desc: 'Bonus 🌿 CE when you nail your macros',
      progress: Math.round(todayProtein),
      total: proteinGoal,
      xp: 40,
      done: todayProtein >= proteinGoal,
    },
    {
      icon: '🔥',
      title: `Hit calorie goal (${calorieGoal} kcal)`,
      desc: 'Consistent days build ZenCoin rewards',
      progress: todayCalories,
      total: calorieGoal,
      xp: 50,
      done: todayCalories >= calorieGoal,
    },
  ]

  return (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">Daily Quests</h3>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>🌿 = Cat Care Energy</span>
      </div>
      {quests.map((q, i) => (
        <div key={i} className={`quest-card ${q.done ? 'done' : ''}`}>
          <span className="quest-icon">{q.done ? '✅' : q.icon}</span>
          <div className="quest-info">
            <p className="quest-title">{q.title}</p>
            <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, margin: '1px 0 4px' }}>{q.desc}</p>
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

const MEAL_TYPE_ZH = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' }

export default function Home({ session, profile, onLogMeal }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

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
              const expanded = expandedId === meal.id
              return (
                <div key={meal.id}
                  className={`meal-card ${expanded ? 'meal-card-expanded' : ''}`}
                  onClick={() => setExpandedId(expanded ? null : meal.id)}
                  style={{ cursor: 'pointer', flexWrap: 'wrap' }}
                >
                  {/* 主列 */}
                  <span className="meal-emoji">{getFoodEmoji(meal.name, meal.meal_type)}</span>
                  <div className="meal-info">
                    <p className="meal-name">{meal.name}</p>
                    <p className="meal-meta">{formatTime(meal.logged_at)} · {MEAL_TYPE_ZH[meal.meal_type] || meal.meal_type}</p>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 4 }}>
                    <div className="meal-score" style={{ background: info.bg, color: info.color }}>{score}</div>
                    <span className="meal-calories">{meal.calories} kcal</span>
                  </div>
                  <button className="meal-delete-btn" onClick={e => { e.stopPropagation(); handleDeleteMeal(meal.id) }}>✕</button>

                  {/* 展開的營養明細 */}
                  {expanded && (
                    <div className="meal-detail" onClick={e => e.stopPropagation()}>
                      <div className="meal-detail-grid">
                        {[
                          ['🔥', '熱量',   meal.calories,  'kcal'],
                          ['🥩', '蛋白質',  meal.protein_g, 'g'],
                          ['🌾', '碳水',    meal.carbs_g,   'g'],
                          ['🧈', '脂肪',    meal.fat_g,     'g'],
                          ['🌿', '纖維',    meal.fiber_g,   'g'],
                        ].map(([icon, label, val, unit]) => (
                          <div key={label} className="meal-detail-item">
                            <span className="meal-detail-icon">{icon}</span>
                            <span className="meal-detail-label">{label}</span>
                            <span className="meal-detail-val">{val ?? '–'}<span className="meal-detail-unit">{unit}</span></span>
                          </div>
                        ))}
                      </div>
                      {meal.data_source && (
                        <p className="meal-detail-source">來源：{meal.data_source}</p>
                      )}
                    </div>
                  )}
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
