import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calcMealRewards } from '../utils/scoring'

const XP_LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7000]

export function getLevel(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) return i + 1
  }
  return 1
}

export function getLevelXp(level) {
  return XP_LEVELS[level - 1] || 0
}

export function getNextLevelXp(level) {
  return XP_LEVELS[level] || XP_LEVELS[XP_LEVELS.length - 1]
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function useProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
    } else {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()
      setProfile(newProfile)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const onMealLogged = useCallback(async (plateScore) => {
    if (!userId) return
    const { data: current } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!current) return

    const today = getToday()
    const yesterday = getYesterday()
    let newStreak = current.streak || 0
    const { xp: xpGain } = calcMealRewards(plateScore)
    const newXp = (current.xp || 0) + xpGain

    if (current.last_logged_date === today) {
      // already logged today — still add XP
    } else if (current.last_logged_date === yesterday) {
      newStreak += 1
    } else {
      newStreak = 1
    }

    const { data: updated } = await supabase
      .from('profiles')
      .update({ xp: newXp, streak: newStreak, last_logged_date: today, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    setProfile(updated)
    return updated
  }, [userId])

  const updateProfile = useCallback(async (updates) => {
    const { data } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    setProfile(data)
    return data
  }, [userId])

  return { profile, loading, onMealLogged, updateProfile, refetch: fetchProfile }
}
