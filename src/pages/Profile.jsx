import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profile({ session }) {
  const [mealCount, setMealCount] = useState(0)

  useEffect(() => {
    supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setMealCount(count || 0))
  }, [session])

  const handleSignOut = () => supabase.auth.signOut()
  const username = session.user.email?.split('@')[0]

  return (
    <>
      <div className="profile-hero">
        <div className="profile-avatar">🌿</div>
        <h2 className="profile-name">{username}</h2>
        <p className="profile-email">{session.user.email}</p>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <p className="pstat-value">{mealCount}</p>
          <p className="pstat-label">Total Meals</p>
        </div>
        <div className="profile-stat">
          <p className="pstat-value">LVL 1</p>
          <p className="pstat-label">Level</p>
        </div>
        <div className="profile-stat">
          <p className="pstat-value">0 🔥</p>
          <p className="pstat-label">Streak</p>
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Settings</h3>
        <button className="signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </>
  )
}
