import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import Stats from './pages/Stats'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'
import LogMealModal from './components/LogMealModal'
import ScanModal from './components/ScanModal'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [showLogModal, setShowLogModal] = useState(false)
  const [showScanModal, setShowScanModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleMealLogged = () => {
    setShowLogModal(false)
    setShowScanModal(false)
    setRefreshKey(k => k + 1)
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!session) return <Login />

  return (
    <div className="app-wrap">
      <header className="app-header">
        <span className="app-logo">🌿 ZENPLATE</span>
      </header>

      <main className="tab-content">
        {activeTab === 'home' && (
          <Home key={refreshKey} session={session} onLogMeal={() => setShowLogModal(true)} />
        )}
        {activeTab === 'stats' && (
          <Stats key={refreshKey} session={session} />
        )}
        {activeTab === 'profile' && (
          <Profile session={session} />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCamera={() => setShowScanModal(true)}
      />

      {showLogModal && (
        <LogMealModal
          session={session}
          onClose={() => setShowLogModal(false)}
          onSaved={handleMealLogged}
        />
      )}

      {showScanModal && (
        <ScanModal
          session={session}
          onClose={() => setShowScanModal(false)}
          onSaved={handleMealLogged}
        />
      )}
    </div>
  )
}
