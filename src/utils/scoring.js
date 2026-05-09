export function calcPlateScore(meal) {
  const { calories = 0, protein_g = 0, fat_g = 0, fiber_g = 0, carbs_g = 0 } = meal
  let score = 50

  // Protein bonus
  if (protein_g >= 30) score += 20
  else if (protein_g >= 20) score += 14
  else if (protein_g >= 10) score += 8
  else if (protein_g < 5) score -= 10

  // Fiber bonus
  if (fiber_g >= 5) score += 15
  else if (fiber_g >= 3) score += 10
  else if (fiber_g >= 1) score += 4

  // Calorie range
  if (calories >= 200 && calories <= 700) score += 10
  else if (calories > 900) score -= 12
  else if (calories < 80) score -= 6

  // Fat penalty
  if (fat_g > 30) score -= 12
  else if (fat_g > 20) score -= 5

  // Carb balance
  if (carbs_g > 0 && carbs_g <= 60) score += 5

  return Math.max(10, Math.min(100, Math.round(score)))
}

export function scoreInfo(score) {
  if (score >= 90) return { label: 'Well Balanced',      color: '#2BB5A0', bg: '#D0EEE8' }
  if (score >= 75) return { label: 'Great Balance',       color: '#4CAF50', bg: '#E8F5E9' }
  if (score >= 60) return { label: 'Pretty Good',         color: '#8BC34A', bg: '#F1F8E9' }
  if (score >= 45) return { label: 'More Balance Needed', color: '#F5A623', bg: '#FFF8E7' }
  return              { label: 'A Bit Unbalanced',    color: '#E57C47', bg: '#FEF0E8' }
}

export function getAchievements(profile, mealCount) {
  const streak = profile?.streak || 0
  const xp = profile?.xp || 0
  const level = Math.floor(Math.sqrt(xp / 50)) + 1

  return [
    { id: 'first_meal', icon: '🍽️', title: 'First Bite', desc: 'Log your first meal', earned: mealCount >= 1 },
    { id: 'meals_10', icon: '🥗', title: 'Getting Started', desc: 'Log 10 meals total', earned: mealCount >= 10 },
    { id: 'meals_30', icon: '🏆', title: 'Dedicated Tracker', desc: 'Log 30 meals total', earned: mealCount >= 30 },
    { id: 'streak_3', icon: '🔥', title: '3-Day Streak', desc: 'Log meals 3 days in a row', earned: streak >= 3 },
    { id: 'streak_7', icon: '🏅', title: '7-Day Win', desc: '7 days straight', earned: streak >= 7 },
    { id: 'streak_14', icon: '💎', title: '14-Day Hero', desc: '2 weeks straight', earned: streak >= 14 },
    { id: 'streak_30', icon: '👑', title: '30-Day Legend', desc: '30 days straight', earned: streak >= 30 },
    { id: 'level_3', icon: '⭐', title: 'Rising Star', desc: 'Reach Level 3', earned: level >= 3 },
    { id: 'level_5', icon: '🌟', title: 'Elite Score', desc: 'Reach Level 5', earned: level >= 5 },
    { id: 'xp_500', icon: '⚡', title: 'XP Hunter', desc: 'Earn 500 XP', earned: xp >= 500 },
  ]
}

export function calcZenCoins(xp) {
  return Math.floor(xp / 2)
}
