import { createPortal } from 'react-dom'
import { scoreInfo } from '../utils/scoring'
import { getLevel, levelProgress } from '../hooks/useProfile'

// ─── Score messages ───────────────────────────────────────────────────────────
function rewardMessage(score) {
  if (score == null)  return "Good job tracking your nutrition!"
  if (score >= 80)    return "Nice balance today. 🌿"
  if (score >= 60)    return "Good job logging your meal."
  if (score >= 40)    return "Every meal you log builds healthy awareness."
  return "Thanks for checking in — every meal logged helps."
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MealRewardModal({
  plateScore,   // null for manual entry
  ceEarned,
  xpEarned,
  totalCE,
  oldXp,
  newXp,
  onGoToRoom,
  onClose,
}) {
  const leveledUp    = getLevel(newXp) > getLevel(oldXp)
  const newLevel     = getLevel(newXp)
  const { lvl, pct } = levelProgress(newXp)
  const si          = plateScore != null ? scoreInfo(plateScore) : null
  const msg         = rewardMessage(plateScore)

  return createPortal(
    <div className="mrew-overlay" onClick={onClose}>
      <div className="mrew-card" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="mrew-header">
          <span className="mrew-icon">✨</span>
          <span className="mrew-title">Meal Logged!</span>
        </div>

        {/* ── Plate Score ── */}
        {plateScore != null && si && (
          <div className="mrew-score-wrap" style={{ background: si.bg }}>
            <span className="mrew-score-num" style={{ color: si.color }}>{plateScore}</span>
            <span className="mrew-score-label" style={{ color: si.color }}>{si.label}</span>
          </div>
        )}
        {plateScore == null && (
          <div className="mrew-score-wrap" style={{ background: '#F0F4F0' }}>
            <span className="mrew-score-label" style={{ color: '#4A7A5A' }}>Manual Log 📝</span>
          </div>
        )}

        {/* ── Message ── */}
        <p className="mrew-msg">{msg}</p>

        {/* ── Reward Badges ── */}
        <div className="mrew-rewards">
          <div className="mrew-badge mrew-badge-ce">
            <span className="mrew-badge-val">+{ceEarned}</span>
            <span className="mrew-badge-icon">⚡</span>
            <span className="mrew-badge-lbl">Care Energy</span>
          </div>
          <div className="mrew-badge mrew-badge-xp">
            <span className="mrew-badge-val">+{xpEarned}</span>
            <span className="mrew-badge-icon">🌟</span>
            <span className="mrew-badge-lbl">Bond XP</span>
          </div>
        </div>

        {/* ── Level Up celebration ── */}
        {leveledUp && (
          <div className="mrew-levelup">
            🎉 Bond Level Up! Lv.{newLevel - 1} → Lv.{newLevel}
          </div>
        )}

        {/* ── XP Progress bar ── */}
        <div className="mrew-progress-wrap">
          <div className="mrew-progress-labels">
            <span>Bond Lv.{lvl}</span>
            <span>{pct}% → Lv.{lvl + 1}</span>
          </div>
          <div className="mrew-progress-track">
            <div className="mrew-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* ── CTA ── */}
        <button className="mrew-cta" onClick={onGoToRoom}>
          Go to My Room →
        </button>
        <p className="mrew-sub">Your cat has <strong>{totalCE} ⚡</strong> care available</p>

        {/* ── Dismiss ── */}
        <button className="mrew-dismiss" onClick={onClose}>Continue</button>

      </div>
    </div>,
    document.body
  )
}
