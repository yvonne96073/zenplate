import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { getLevel, getLevelXp, getNextLevelXp } from '../hooks/useProfile'
import { calcStars } from '../utils/scoring'
import { calcNutritionGoals } from '../utils/nutrition'
import MyRoom, { THEMES, ACCESSORIES } from '../components/MyRoom'

const AVATAR_SEEDS = ['Felix', 'Lily', 'Zoe', 'Luna', 'Mia', 'Kai', 'Leo', 'Aria', 'Sam', 'Nova']
const DICEBEAR = (seed) => `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=2BB5A0&textColor=ffffff&fontSize=40`

export function getAvatarUrl(avatar) {
  if (!avatar || avatar.startsWith('http')) return avatar
  if (AVATAR_SEEDS.includes(avatar)) return DICEBEAR(avatar)
  return DICEBEAR('Felix')
}

// ── Portal modal ─────────────────────────────────────────────
function Modal({ onClose, title, children }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-content">
          {title && <h3 className="modal-title">{title}</h3>}
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

function AvatarImg({ seed, size = 72, selected = false }) {
  return (
    <img src={DICEBEAR(seed)} alt={seed} style={{
      width: size, height: size, borderRadius: '50%',
      border: selected ? '3px solid var(--primary)' : '3px solid var(--border)',
      background: '#f0f8ff', objectFit: 'cover',
      boxShadow: selected ? '0 0 0 3px var(--primary-light)' : 'none',
      cursor: 'pointer', transition: 'all 0.15s',
    }} />
  )
}

function NotifRow({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>{label}</span>
      <div className={`toggle ${checked ? 'on' : ''}`} onClick={onChange}>
        <div className="toggle-knob" />
      </div>
    </div>
  )
}

function getTitleBadge(level, streak) {
  if (level >= 8 || streak >= 30) return '👑 Zen Legend · Top 1%'
  if (level >= 5 || streak >= 14) return '🏆 Zen Elite · Top 5%'
  if (level >= 3 || streak >= 7)  return '⭐ Rising Star · Top 20%'
  return '🌱 Beginner · Keep Going!'
}

function getQuestResetTime() {
  const now = new Date()
  const midnight = new Date(); midnight.setHours(24, 0, 0, 0)
  const diff = midnight - now
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${h}h ${m}m`
}

// ── Star Shop ─────────────────────────────────────────────────
const STAR_SHOP = [
  { id: 'ocean',        emoji: '🌊', name: 'Ocean Theme',   price: 5,  desc: 'Unlocks in My Room — dive into the deep blue',  category: '🎨 Themes' },
  { id: 'night',        emoji: '🌙', name: 'Night Theme',   price: 10, desc: 'Unlocks in My Room — starry night vibes',       category: '🎨 Themes' },
  { id: 'leaf_collar',  emoji: '🍃', name: 'Leaf Collar',   price: 3,  desc: 'A fresh forest touch for your cat',             category: '✨ Accessories' },
  { id: 'wave_scarf',   emoji: '〰️', name: 'Wave Scarf',    price: 5,  desc: 'Flow with the ocean breeze',                   category: '✨ Accessories' },
  { id: 'flower_crown', emoji: '🌺', name: 'Flower Crown',  price: 8,  desc: 'Bloom beautifully, petal by petal',            category: '✨ Accessories' },
  { id: 'star_cape',    emoji: '🌟', name: 'Star Cape',     price: 10, desc: 'Shine across the room',                        category: '✨ Accessories' },
]

// ── Quest pool: 10 quests, pick 3 per day by date-seed ───────
function buildQuestPool(meals, profile) {
  const pg = profile?.protein_goal || 60
  const cg = profile?.calorie_goal || 2000
  const todayProtein = meals.reduce((s, m) => s + (m.protein_g || 0), 0)
  const todayCalories = meals.reduce((s, m) => s + (m.calories || 0), 0)
  const todayFiber = meals.reduce((s, m) => s + (m.fiber_g || 0), 0)
  const todayFat = meals.reduce((s, m) => s + (m.fat_g || 0), 0)

  return [
    { icon: '🥗', title: 'Scan 3 Meals',      desc: 'Log breakfast, lunch & dinner',      xp: 80,  progress: Math.min(meals.length, 3),          total: 3,    done: meals.length >= 3,          reward: '🎀 Pink Ribbon' },
    { icon: '💪', title: 'Protein Champion',  desc: `Hit protein goal (${pg}g)`,           xp: 120, progress: Math.round(todayProtein),            total: pg,   done: todayProtein >= pg,         reward: '+50 XP' },
    { icon: '🔥', title: 'Calorie Target',    desc: `Hit calorie goal (${cg} kcal)`,       xp: 100, progress: Math.round(todayCalories),           total: cg,   done: todayCalories >= cg * 0.9,  reward: '🛡️ Shield' },
    { icon: '🥦', title: 'Fiber Boost',       desc: 'Get 15g fiber today',                 xp: 90,  progress: Math.round(todayFiber),              total: 15,   done: todayFiber >= 15,           reward: '+40 XP' },
    { icon: '💚', title: 'Light Day',         desc: 'Keep fat under 50g today',            xp: 80,  progress: Math.round(todayFat),                total: 50,   done: todayFat <= 50 && meals.length > 0, reward: '+30 XP' },
    { icon: '🌅', title: 'Early Bird',        desc: 'Log a breakfast today',               xp: 60,  progress: meals.filter(m => m.meal_type === 'breakfast').length, total: 1, done: meals.some(m => m.meal_type === 'breakfast'), reward: '+25 XP' },
    { icon: '🌙', title: 'Night Routine',     desc: 'Log dinner before day ends',          xp: 60,  progress: meals.filter(m => m.meal_type === 'dinner').length,    total: 1, done: meals.some(m => m.meal_type === 'dinner'),    reward: '+25 XP' },
    { icon: '⚡', title: 'Power Lunch',       desc: 'Log a lunch with 20g+ protein',       xp: 100, progress: meals.filter(m => m.meal_type === 'lunch' && m.protein_g >= 20).length, total: 1, done: meals.some(m => m.meal_type === 'lunch' && m.protein_g >= 20), reward: '+45 XP' },
    { icon: '🍱', title: 'Complete Plate',    desc: 'Log all 4 meal types today',          xp: 150, progress: new Set(meals.map(m => m.meal_type)).size, total: 4, done: new Set(meals.map(m => m.meal_type)).size >= 4, reward: '🌊 Wave Scarf' },
    { icon: '📊', title: 'Consistent Day',   desc: 'Log at least 2 meals',                 xp: 50,  progress: Math.min(meals.length, 2),           total: 2,    done: meals.length >= 2,          reward: '+20 XP' },
  ]
}

// Deterministic daily quest selection (3 from 10)
function getDailyQuestIndices() {
  const now = new Date()
  const seed = now.getFullYear() * 1000 + Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const order = Array.from({ length: 10 }, (_, i) => i)
  for (let i = 9; i > 0; i--) {
    const j = Math.abs(Math.sin(seed * (i + 7)) * 9999 | 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]]
  }
  return order.slice(0, 3)
}

const DAILY_INDICES = getDailyQuestIndices()

// (Shop replaced by ZEN_COLLECTIONS + ZEN_FEATURED above)

// ── Nutrition calculator helper ────────────────────────────────
const ACTIVITY_LABELS = [
  { value: 'sedentary', label: '🪑 Sedentary',   sub: 'Desk job, no exercise' },
  { value: 'light',     label: '🚶 Light',        sub: 'Walk 1-3x / week' },
  { value: 'moderate',  label: '🏃 Moderate',    sub: 'Exercise 3-5x / week' },
  { value: 'active',    label: '🏋️ Active',      sub: 'Exercise 6-7x / week' },
]
const GOAL_LABELS = [
  { value: 'lose',   label: '📉 Lose weight',    sub: '-500 kcal/day' },
  { value: 'maintain', label: '⚖️ Maintain',    sub: 'Stay at current weight' },
  { value: 'gain',   label: '📈 Build muscle',   sub: '+250 kcal/day' },
]

export default function Profile({ session, profile, updateProfile }) {
  const [editingAvatar, setEditingAvatar]   = useState(false)
  const [showRoom, setShowRoom]             = useState(false)
  const [showGoals, setShowGoals]           = useState(false)
  const [showCalc, setShowCalc]             = useState(false)
  const [showNotif, setShowNotif]           = useState(false)
  const [showShop, setShowShop]             = useState(false)
  const [showAllAch, setShowAllAch]         = useState(false)
  const [showAllWardrobe, setShowAllWardrobe] = useState(false)
  const [calorieGoal, setCalorieGoal]       = useState(profile?.calorie_goal || 2000)
  const [proteinGoal, setProteinGoal]       = useState(profile?.protein_goal || 60)
  const [saving, setSaving]                 = useState(false)
  const [mealCount, setMealCount]           = useState(0)
  const [todayMeals, setTodayMeals]         = useState([])
  const [notif, setNotif]                   = useState({ meals: true, streaks: true, tips: false })
  const [toast, setToast]           = useState('')
  const [equippedTheme, setEquippedTheme] = useState(() => localStorage.getItem('zp_theme') || 'japandi')
  const [equippedAcc, setEquippedAcc]     = useState(() => localStorage.getItem('zp_acc')   || 'green_collar')
  const [purchases, setPurchases]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('zp_purchased') || '[]') } catch { return [] }
  })
  const [starsSpent, setStarsSpent]       = useState(() =>
    parseInt(localStorage.getItem('zp_stars_spent') || '0')
  )

  // Calculator form state
  const [calc, setCalc] = useState({ height: '', weight: '', age: '', gender: 'female', activity: 'light', goal: 'maintain' })
  const [calcResult, setCalcResult] = useState(null)

  useEffect(() => {
    if (profile) {
      setCalorieGoal(profile.calorie_goal || 2000)
      setProteinGoal(profile.protein_goal || 60)
    }
  }, [profile])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('meals').select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setMealCount(count || 0))
    supabase.from('meals').select('*')
      .eq('user_id', session.user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .then(({ data }) => setTodayMeals(data || []))
  }, [session])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200) }
  const handleSignOut = () => supabase.auth.signOut()
  const displayName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0]

  const xp         = profile?.xp || 0
  const streak     = profile?.streak || 0
  const level      = getLevel(xp)
  const levelEnd   = getNextLevelXp(level)
  const xpPct      = Math.round(((xp - getLevelXp(level)) / (levelEnd - getLevelXp(level))) * 100)
  const totalStars     = calcStars(streak)
  const spendableStars = Math.max(0, totalStars - starsSpent)

  // Unlock context — shared with My Room's THEMES/ACCESSORIES
  const unlockCtx = { streak, stars: spendableStars, mealCount, purchased: purchases }

  const handleEquipTheme = (id) => {
    const t = THEMES.find(x => x.id === id)
    if (!t?.unlock(unlockCtx)) { showToast(`🔒 Unlock: ${t?.req}`); return }
    setEquippedTheme(id)
    localStorage.setItem('zp_theme', id)
    showToast(`✅ ${t.name} theme equipped!`)
  }

  const handleEquipAcc = (id) => {
    const a = ACCESSORIES.find(x => x.id === id)
    if (!a?.unlock(unlockCtx)) { showToast(`🔒 Unlock: ${a?.req}`); return }
    setEquippedAcc(id)
    localStorage.setItem('zp_acc', id)
    showToast(`✅ ${a.name} equipped!`)
  }

  // Achievements list
  const achList = [
    { id: 'first_meal', icon: '🍽️', title: 'First Bite',        earned: mealCount >= 1,  left: `${Math.max(0,1-mealCount)} meals left` },
    { id: 'meals_10',   icon: '🥗', title: 'Getting Started',   earned: mealCount >= 10, left: `${Math.max(0,10-mealCount)} meals left` },
    { id: 'meals_30',   icon: '🏆', title: 'Dedicated Tracker', earned: mealCount >= 30, left: `${Math.max(0,30-mealCount)} meals left` },
    { id: 'meals_50',   icon: '🌟', title: 'Century Tracker',   earned: mealCount >= 50, left: `${Math.max(0,50-mealCount)} meals left` },
    { id: 'streak_3',   icon: '🔥', title: '3-Day Streak',      earned: streak >= 3,     left: `${Math.max(0,3-streak)} days left` },
    { id: 'streak_7',   icon: '🏅', title: '7-Day Win',         earned: streak >= 7,     left: `${Math.max(0,7-streak)} days left` },
    { id: 'streak_14',  icon: '💎', title: '14-Day Hero',       earned: streak >= 14,    left: `${Math.max(0,14-streak)} days left` },
    { id: 'streak_30',  icon: '👑', title: '30-Day Legend',     earned: streak >= 30,    left: `${Math.max(0,30-streak)} days left` },
    { id: 'level_3',    icon: '⭐', title: 'Rising Star',       earned: level >= 3,      left: `Lv.${level} → 3` },
    { id: 'level_5',    icon: '🌟', title: 'Elite Score',       earned: level >= 5,      left: `Lv.${level} → 5` },
    { id: 'level_10',   icon: '🚀', title: 'Veteran',           earned: level >= 10,     left: `Lv.${level} → 10` },
    { id: 'xp_500',     icon: '⚡', title: 'XP Hunter',         earned: xp >= 500,       left: `${Math.max(0,500-xp)} XP left` },
    { id: 'xp_1000',    icon: '💥', title: 'XP Master',         earned: xp >= 1000,      left: `${Math.max(0,1000-xp)} XP left` },
  ]

  // Daily quests: 3 picked by today's date
  const questPool = buildQuestPool(todayMeals, profile)
  const todayQuests = DAILY_INDICES.map(i => questPool[i])

  const handleSaveGoals = async () => {
    setSaving(true)
    await updateProfile({ calorie_goal: Number(calorieGoal), protein_goal: Number(proteinGoal) })
    setSaving(false)
    setShowGoals(false)
    showToast('✅ Goals saved!')
  }

  const handleRunCalc = () => {
    if (!calc.height || !calc.weight || !calc.age) { showToast('Please fill all fields'); return }
    const result = calcNutritionGoals(calc)
    setCalcResult(result)
  }

  const handleApplyCalc = () => {
    setCalorieGoal(calcResult.calories)
    setProteinGoal(calcResult.protein)
    setCalcResult(null)
    setShowCalc(false)
    setShowGoals(true)
    showToast('✅ Goals updated from your stats!')
  }

  const handleBuy = (item) => {
    if (purchases.includes(item.id)) { showToast(`✅ Already owned!`); return }
    if (spendableStars < item.price) { showToast(`⭐ Need ${item.price} Stars (have ${spendableStars})`); return }
    const newSpent     = starsSpent + item.price
    const newPurchases = [...purchases, item.id]
    localStorage.setItem('zp_stars_spent', String(newSpent))
    localStorage.setItem('zp_purchased',   JSON.stringify(newPurchases))
    setStarsSpent(newSpent)
    setPurchases(newPurchases)
    showToast(`✅ ${item.name} added to wardrobe!`)
  }

  const notifCount     = Object.values(notif).filter(Boolean).length
  const unlockedThemes = THEMES.filter(t => !t.unlock || t.unlock(unlockCtx)).length
  const unlockedAccs   = ACCESSORIES.filter(a => a.unlock(unlockCtx)).length
  const unlockedCount  = unlockedThemes + unlockedAccs

  return (
    <>
      {toast && createPortal(<div className="pf-toast">{toast}</div>, document.body)}

      {/* ── Hero ── */}
      <div className="pf-hero">
        <button className="pf-edit-btn" onClick={() => setEditingAvatar(true)}>✏️ Edit</button>
        <div className="pf-av" onClick={() => setEditingAvatar(true)}>
          <img src={DICEBEAR(profile?.avatar || 'Felix')} alt="avatar" />
          <div className="pf-av-badge">
            {ACCESSORIES.find(a => a.id === equippedAcc && a.dispEmoji)?.dispEmoji || '🌿'}
          </div>
        </div>
        <p className="pf-name">{displayName}</p>
        <div className="pf-title-badge">{getTitleBadge(level, streak)}</div>
        <div className="pf-xp-wrap">
          <div className="pf-xp-label"><span>Lv.{level}</span><span>{xp} / {levelEnd} XP</span></div>
          <div className="xp-bar-bg"><div className="xp-bar-fill" style={{ width: `${xpPct}%` }} /></div>
        </div>
        <div className="pf-stats-row">
          <div className="pf-stat"><div className="pf-snum">🔥 {streak}</div><div className="pf-slbl">Streak</div></div>
          <div className="pf-stat"><div className="pf-snum">Lv.{level}</div><div className="pf-slbl">Level</div></div>
          <div className="pf-stat"><div className="pf-snum">⭐ {spendableStars}</div><div className="pf-slbl">Stars</div></div>
          <div className="pf-stat"><div className="pf-snum">⚡ {Math.max(0, parseInt(localStorage.getItem('zp_care_energy')||'0'))}</div><div className="pf-slbl">Care Energy</div></div>
        </div>
      </div>

      {/* ── Avatar picker ── */}
      {editingAvatar && (
        <div className="section">
          <h3 className="section-title">Choose Your Character</h3>
          <div className="avatar-grid">
            {AVATAR_SEEDS.map(seed => (
              <div key={seed} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                onClick={() => { updateProfile({ avatar: seed }); setEditingAvatar(false) }}>
                <AvatarImg seed={seed} size={56} selected={(profile?.avatar || 'Felix') === seed} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{seed}</span>
              </div>
            ))}
          </div>
          <button className="signout-btn" style={{ marginTop: 8 }} onClick={() => setEditingAvatar(false)}>Cancel</button>
        </div>
      )}

      {/* ── Wardrobe ── */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">👗 Wardrobe</h3>
          <span className="view-all-link" onClick={() => setShowAllWardrobe(true)}>
            {unlockedCount}/{THEMES.length + ACCESSORIES.length} · Manage ›
          </span>
        </div>
        <div className="wd-preview-row">
          <div className="wd-preview-chip">
            <span className="wd-chip-icon">{THEMES.find(t => t.id === equippedTheme)?.emoji}</span>
            <div className="wd-chip-info">
              <span className="wd-chip-label">Theme</span>
              <span className="wd-chip-name">{THEMES.find(t => t.id === equippedTheme)?.name}</span>
            </div>
          </div>
          <div className="wd-preview-chip">
            <span className="wd-chip-icon">{ACCESSORIES.find(a => a.id === equippedAcc)?.emoji}</span>
            <div className="wd-chip-info">
              <span className="wd-chip-label">Accessory</span>
              <span className="wd-chip-name">{ACCESSORIES.find(a => a.id === equippedAcc)?.name}</span>
            </div>
          </div>
          <button className="wd-manage-btn" onClick={() => setShowAllWardrobe(true)}>Edit ›</button>
        </div>
      </div>

      {/* ── My Room ── */}
      <div className="section">
        <h3 className="section-title">🏠 My Room</h3>
        <button className="room-entry-btn" onClick={() => setShowRoom(true)}>
          <div className="room-entry-inner">
            <span className="room-entry-icon">🐱</span>
            <div className="room-entry-text">
              <div className="room-entry-title">Visit Your Cat</div>
              <div className="room-entry-sub">Use ⚡ Care Energy to feed &amp; play · +30 ⚡ per meal logged</div>
            </div>
            <span className="room-entry-arrow">›</span>
          </div>
        </button>
      </div>

      {/* ── Daily Quests ── */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">📋 Daily Quests</h3>
          <span className="qb-reset">Resets in {getQuestResetTime()}</span>
        </div>
        {todayQuests.map((q, i) => (
          <div key={i} className={`quest-card ${q.done ? 'done' : ''}`}>
            <span className="quest-icon">{q.done ? '✅' : q.icon}</span>
            <div className="quest-info">
              <p className="quest-title">{q.title}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{q.desc}</p>
              <div className="quest-bar-wrap">
                <div className="quest-bar" style={{ width: `${Math.min((q.progress / q.total) * 100, 100)}%` }} />
              </div>
              <p className="quest-sub">{q.progress} / {q.total}{q.done ? ' ✓' : ''}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="quest-xp">+{q.xp} XP</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{q.reward}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Achievements ── */}
      <div className="section">
        <div className="section-header">
          <h3 className="section-title">🏅 Achievements</h3>
          <span className="view-all-link" onClick={() => setShowAllAch(true)}>
            {achList.filter(a => a.earned).length}/{achList.length} · View All ›
          </span>
        </div>
        <div className="achievements-grid">
          {achList.slice(0, 6).map(a => (
            <div key={a.id} className={`achievement-card ${a.earned ? 'earned' : 'locked'}`}>
              <span className="achievement-icon">{a.earned ? a.icon : '🔒'}</span>
              <p className="achievement-title">{a.title}</p>
              <p className={`achievement-status ${a.earned ? 'done' : ''}`}>
                {a.earned ? 'Earned ✓' : a.left}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="section">
        <h3 className="section-title">⚙️ Settings</h3>
        <div className="setting-row" onClick={() => setShowGoals(true)}>
          <div className="sr-icon" style={{ background: '#E4F2EE' }}>🎯</div>
          <div className="sr-info">
            <div className="sr-name">My Goals</div>
            <div className="sr-sub">{calorieGoal} kcal · {proteinGoal}g protein</div>
          </div>
          <div className="sr-right"><div className="sr-arrow">›</div></div>
        </div>
        <div className="setting-row" onClick={() => setShowNotif(true)}>
          <div className="sr-icon" style={{ background: '#EEF2FF' }}>🔔</div>
          <div className="sr-info">
            <div className="sr-name">Notifications</div>
            <div className="sr-sub">Meals · Streaks · Tips</div>
          </div>
          <div className="sr-right">
            <div className="sr-badge">{notifCount} ON</div>
            <div className="sr-arrow">›</div>
          </div>
        </div>
        <div className="setting-row" onClick={() => setShowShop(true)}>
          <div className="sr-icon" style={{ background: '#FFFBE6' }}>⭐</div>
          <div className="sr-info">
            <div className="sr-name">Star Shop</div>
            <div className="sr-sub">⭐ {spendableStars} available · earn from streaks</div>
          </div>
          <div className="sr-right">
            <div className="sr-badge" style={{ background: '#FFF9C4', color: '#7A6000' }}>Shop</div>
            <div className="sr-arrow">›</div>
          </div>
        </div>
      </div>

      <div className="section">
        <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
      </div>

      {/* ══ Portal Modals ══ */}

      {showGoals && (
        <Modal title="🎯 My Goals" onClose={() => setShowGoals(false)}>
          <button className="calc-hint-btn" onClick={() => { setShowGoals(false); setShowCalc(true) }}>
            🧮 Don't know your numbers? Calculate for me →
          </button>
          <div className="form-group">
            <label>Daily Calories (kcal)</label>
            <input className="form-input" type="number" value={calorieGoal} onChange={e => setCalorieGoal(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Daily Protein (g)</label>
            <input className="form-input" type="number" value={proteinGoal} onChange={e => setProteinGoal(e.target.value)} />
          </div>
          <button className="submit-btn" onClick={handleSaveGoals} disabled={saving}>
            {saving ? 'Saving...' : '✓ Save Goals'}
          </button>
          <button className="signout-btn" style={{ marginTop: 8 }} onClick={() => setShowGoals(false)}>Cancel</button>
        </Modal>
      )}

      {showCalc && (
        <Modal title="🧮 Calculate My Goals" onClose={() => setShowCalc(false)}>
          {!calcResult ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                Enter your basic stats and we'll recommend daily calorie & protein targets.
              </p>
              <div className="form-row">
                <div className="form-group half">
                  <label>Height (cm)</label>
                  <input className="form-input" type="number" placeholder="e.g. 165"
                    value={calc.height} onChange={e => setCalc(c => ({ ...c, height: e.target.value }))} />
                </div>
                <div className="form-group half">
                  <label>Weight (kg)</label>
                  <input className="form-input" type="number" placeholder="e.g. 60"
                    value={calc.weight} onChange={e => setCalc(c => ({ ...c, weight: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group half">
                  <label>Age</label>
                  <input className="form-input" type="number" placeholder="e.g. 25"
                    value={calc.age} onChange={e => setCalc(c => ({ ...c, age: e.target.value }))} />
                </div>
                <div className="form-group half">
                  <label>Gender</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    {['female','male'].map(g => (
                      <button key={g} type="button"
                        className={`meal-type-btn ${calc.gender === g ? 'active' : ''}`}
                        onClick={() => setCalc(c => ({ ...c, gender: g }))}>
                        {g === 'female' ? '👩 F' : '👨 M'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Activity Level</label>
                {ACTIVITY_LABELS.map(a => (
                  <div key={a.value}
                    className={`calc-option ${calc.activity === a.value ? 'active' : ''}`}
                    onClick={() => setCalc(c => ({ ...c, activity: a.value }))}>
                    <span style={{ fontWeight: 800 }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.sub}</span>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label>My Goal</label>
                {GOAL_LABELS.map(g => (
                  <div key={g.value}
                    className={`calc-option ${calc.goal === g.value ? 'active' : ''}`}
                    onClick={() => setCalc(c => ({ ...c, goal: g.value }))}>
                    <span style={{ fontWeight: 800 }}>{g.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.sub}</span>
                  </div>
                ))}
              </div>
              <button className="submit-btn" onClick={handleRunCalc}>Calculate →</button>
            </>
          ) : (
            <>
              <div className="calc-result-card">
                <div className="calc-bmi-row">
                  <span>BMI: <strong>{calcResult.bmi}</strong></span>
                  <span className={`bmi-label bmi-${calcResult.bmiLabel.toLowerCase()}`}>{calcResult.bmiLabel}</span>
                </div>
                <div className="calc-tdee">Maintenance calories (TDEE): <strong>{calcResult.tdee} kcal</strong></div>
              </div>
              <div className="calc-recommended">
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>Recommended for your goal:</p>
                <div className="calc-num-row">
                  <div className="calc-num-card">
                    <div className="calc-num">{calcResult.calories}</div>
                    <div className="calc-num-lbl">kcal / day</div>
                  </div>
                  <div className="calc-num-card">
                    <div className="calc-num">{calcResult.protein}g</div>
                    <div className="calc-num-lbl">protein / day</div>
                  </div>
                </div>
              </div>
              <button className="submit-btn" onClick={handleApplyCalc}>✓ Apply These Goals</button>
              <button className="signout-btn" style={{ marginTop: 8 }} onClick={() => setCalcResult(null)}>← Recalculate</button>
            </>
          )}
        </Modal>
      )}

      {showAllWardrobe && (
        <Modal title="👗 Wardrobe" onClose={() => setShowAllWardrobe(false)}>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14, fontWeight: 600 }}>
            Tap to equip · 🔒 items unlock by milestone or ⭐ purchase in Star Shop
          </p>

          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Themes</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
            {THEMES.map(t => {
              const isOn     = equippedTheme === t.id
              const unlocked = !t.unlock || t.unlock(unlockCtx)
              return (
                <div key={t.id}
                  className={`w-item ${isOn ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleEquipTheme(t.id)}>
                  <div className="w-emoji">{t.emoji}</div>
                  <div className="w-name">{t.name}</div>
                  <div className={`w-status ${isOn ? 'eq' : !unlocked ? 'lk' : ''}`}>
                    {isOn ? '✓ On' : !unlocked ? `🔒 ${t.req}` : 'Equip'}
                  </div>
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Accessories</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ACCESSORIES.map(a => {
              const isOn     = equippedAcc === a.id
              const unlocked = a.unlock(unlockCtx)
              return (
                <div key={a.id}
                  className={`w-item ${isOn ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleEquipAcc(a.id)}>
                  <div className="w-emoji">{a.emoji}</div>
                  <div className="w-name">{a.name}</div>
                  <div className={`w-status ${isOn ? 'eq' : !unlocked ? 'lk' : ''}`}>
                    {isOn ? '✓ On' : !unlocked ? `🔒 ${a.req}` : 'Equip'}
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      {showAllAch && (
        <Modal title="🏅 All Achievements" onClose={() => setShowAllAch(false)}>
          <div className="achievements-grid" style={{ marginBottom: 16 }}>
            {achList.map(a => (
              <div key={a.id} className={`achievement-card ${a.earned ? 'earned' : 'locked'}`}>
                <span className="achievement-icon">{a.earned ? a.icon : '🔒'}</span>
                <p className="achievement-title">{a.title}</p>
                <p className={`achievement-status ${a.earned ? 'done' : ''}`}>
                  {a.earned ? 'Earned ✓' : a.left}
                </p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showNotif && (
        <Modal title="🔔 Notifications" onClose={() => setShowNotif(false)}>
          <NotifRow label="Meal Reminders" checked={notif.meals}   onChange={() => setNotif(n => ({ ...n, meals: !n.meals }))} />
          <NotifRow label="Streak Alerts"  checked={notif.streaks} onChange={() => setNotif(n => ({ ...n, streaks: !n.streaks }))} />
          <NotifRow label="Daily Tips"     checked={notif.tips}    onChange={() => setNotif(n => ({ ...n, tips: !n.tips }))} />
          <button className="submit-btn" style={{ marginTop: 16 }}
            onClick={() => { setShowNotif(false); showToast('✅ Settings saved!') }}>Save</button>
        </Modal>
      )}

      {showRoom && (
        <MyRoom
          avatar={profile?.avatar || 'Felix'}
          xp={xp}
          streak={streak}
          mealCount={mealCount}
          level={level}
          onClose={() => setShowRoom(false)}
        />
      )}

      {showShop && (
        <Modal title="⭐ Star Shop" onClose={() => setShowShop(false)}>
          {/* Balance bar */}
          <div className="zr-balance-bar">
            <div>
              <p className="zr-balance-label">Your Stars</p>
              <p className="zr-balance-amt">⭐ {spendableStars}</p>
            </div>
            <p className="zr-balance-hint">Earned from streak milestones</p>
          </div>

          {/* How to earn */}
          <div className="zr-earn-row">
            {[
              { icon: '🔥', act: '3-day streak',  reward: '+1 ⭐' },
              { icon: '🔥', act: '7-day streak',  reward: '+3 ⭐' },
              { icon: '💎', act: '14-day streak', reward: '+7 ⭐' },
              { icon: '👑', act: '30-day streak', reward: '+10 ⭐' },
            ].map(e => (
              <div key={e.act} className="zr-earn-chip">
                <span className="zr-earn-icon">{e.icon}</span>
                <span className="zr-earn-act">{e.act}</span>
                <span className="zr-earn-reward">{e.reward}</span>
              </div>
            ))}
          </div>

          {/* Group items by category */}
          {['🎨 Themes', '✨ Accessories'].map(cat => (
            <div key={cat}>
              <p className="zr-section-label">{cat}</p>
              <div className="zr-item-list">
                {STAR_SHOP.filter(item => item.category === cat).map(item => {
                  const owned  = purchases.includes(item.id)
                  const canBuy = spendableStars >= item.price
                  return (
                    <div key={item.id} className="zr-item">
                      <span className="zr-item-emoji">{item.emoji}</span>
                      <div className="zr-item-info">
                        <p className="zr-item-name">{item.name}</p>
                        <p className="zr-item-desc">{item.desc}</p>
                      </div>
                      <button
                        className={`zr-buy-btn ${owned ? 'owned' : canBuy ? 'active' : 'disabled'}`}
                        onClick={() => handleBuy(item)}
                      >
                        {owned ? '✓ Owned' : `⭐ ${item.price}`}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </>
  )
}
