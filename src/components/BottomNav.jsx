export default function BottomNav({ activeTab, onTabChange, onCamera }) {
  return (
    <nav className="bnav">
      <button className={`nb ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onTabChange('home')}>
        <span className="nb-icon">📖</span>
        <span className="nb-lbl">JOURNAL</span>
      </button>
      <button className={`nb ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => onTabChange('stats')}>
        <span className="nb-icon">📊</span>
        <span className="nb-lbl">STATS</span>
      </button>
      <button className="nb" onClick={onCamera}>
        <span className="nb-cam-icon">📷</span>
        <span className="nb-lbl">SCAN</span>
      </button>
      <button className={`nb ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => onTabChange('profile')}>
        <span className="nb-icon">👤</span>
        <span className="nb-lbl">PROFILE</span>
      </button>
    </nav>
  )
}
