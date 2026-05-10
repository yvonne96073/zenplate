import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { calcStars } from '../utils/scoring'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PET_KEY    = 'zp_pet_v3'
const PROG_KEY   = 'zp_prog_v2'          // new key → old data ignored
const CE_KEY     = 'zp_care_energy'      // Care Energy — earned from logging meals
const FEED_COST  = 20                     // 20 CE per feed
const PLAY_COST  = 15                     // 15 CE per play
const CAT_W      = 160                    // sprite display width per frame
const CAT_H      = 133                    // sprite approx display height

function loadCE() { return Math.max(0, parseInt(localStorage.getItem(CE_KEY) || '0')) }
function saveCE(n) { localStorage.setItem(CE_KEY, String(Math.max(0, n))) }

const STATE_DURATION = { eating: 5000, playing: 8000, scratching: 6000 }

// Floor object positions (left %, bottom % of scene)
const OBJ = {
  bowl:    { x: 35, y: 8  },
  toy:     { x: 62, y: 8  },
  scratch: { x: 13, y: 10 },
  bed:     { x: 6,  y: 22 },
  center:  { x: 47, y: 8  },
}


// ── Room themes — shared with Wardrobe in Profile.jsx ────────────────────────
// unlock(ctx) where ctx = { streak, stars, mealCount, purchased[] }
export const THEMES = [
  { id: 'japandi', name: 'Cozy',   emoji: '🪨', req: null,              unlock: () => true },
  { id: 'cafe',    name: 'Cafe',   emoji: '☕', req: '3-day streak',    unlock: (c) => c.streak >= 3 },
  { id: 'forest',  name: 'Forest', emoji: '🌿', req: '7-day streak',    unlock: (c) => c.streak >= 7 },
  { id: 'ocean',   name: 'Ocean',  emoji: '🌊', req: '5 ⭐',            unlock: (c) => c.purchased.includes('ocean') },
  { id: 'night',   name: 'Night',  emoji: '🌙', req: '10 ⭐',           unlock: (c) => c.purchased.includes('night') },
]

// ── Cat accessories — shared with Wardrobe in Profile.jsx ────────────────────
export const ACCESSORIES = [
  { id: 'none',         name: 'None',         emoji: '—',  dispEmoji: null, req: null,             unlock: () => true },
  { id: 'green_collar', name: 'Green Collar', emoji: '💚', dispEmoji: '💚', req: 'Always',         unlock: () => true },
  { id: 'bell_collar',  name: 'Bell Collar',  emoji: '🔔', dispEmoji: '🔔', req: '3-day streak',   unlock: (c) => c.streak >= 3 },
  { id: 'sunny_scarf',  name: 'Sunny Scarf',  emoji: '🌻', dispEmoji: '🌻', req: '5 meals',        unlock: (c) => c.mealCount >= 5 },
  { id: 'leaf_collar',  name: 'Leaf Collar',  emoji: '🍃', dispEmoji: '🍃', req: '3 ⭐',           unlock: (c) => c.purchased.includes('leaf_collar') },
  { id: 'wave_scarf',   name: 'Wave Scarf',   emoji: '〰️', dispEmoji: '〰️', req: '5 ⭐',           unlock: (c) => c.purchased.includes('wave_scarf') },
  { id: 'flower_crown', name: 'Flower Crown', emoji: '🌺', dispEmoji: '🌺', req: '8 ⭐',           unlock: (c) => c.purchased.includes('flower_crown') },
]

// ─────────────────────────────────────────────────────────────────────────────
// DAILY QUOTE
// ─────────────────────────────────────────────────────────────────────────────
const DAILY_QUOTES = [
  "Hope and happiness grow when you make room for what you love.",
  "Life feels brighter when you spend time on what matters to you.",
  "Little healthy choices can lead to beautiful changes.",
  "You are building a life that cares for both body and mind.",
  "Small steps still count, especially the gentle ones.",
  "A calm routine can create powerful change.",
  "Taking care of yourself is never a small thing.",
  "Progress can be quiet and still meaningful.",
  "Joy often grows from the little things we keep doing.",
  "Healthy habits are a form of self-kindness.",
]

function getDailyQuote() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now - start) / 86400000)
  return DAILY_QUOTES[day % DAILY_QUOTES.length]
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────
function defaultPet() {
  return { petState: 'idle', pos: { x: 47, y: 8 }, hunger: 20, mood: 70, energy: 80, flipX: false, lastUpdatedAt: Date.now() }
}

function loadPet() {
  try {
    const raw = localStorage.getItem(PET_KEY)
    if (!raw) return defaultPet()
    const s = JSON.parse(raw)
    const elapsed = Date.now() - (s.lastUpdatedAt || Date.now())
    const ticks   = Math.min(Math.floor(elapsed / 5000), 720)
    let { petState, hunger, mood, energy } = s
    for (let i = 0; i < ticks; i++) {
      if (petState !== 'eating')   hunger  = Math.min(hunger + 2, 100)
      if (petState === 'sleeping') energy  = Math.min(energy + 3, 100)
      else                         energy  = Math.max(energy - 0.2, 0)
    }
    hunger = Math.round(Math.min(100, Math.max(0, hunger)))
    energy = Math.round(Math.min(100, Math.max(0, energy)))
    mood   = Math.round(Math.min(100, Math.max(0, mood)))
    if (hunger >= 90 && petState !== 'sleeping') petState = 'veryHungry'
    else if (hunger >= 70 && petState !== 'sleeping') petState = 'hungry'
    else if (['walking','eating','playing','scratching'].includes(petState)) petState = 'idle'
    return { ...s, petState, hunger, mood, energy, lastUpdatedAt: Date.now() }
  } catch { return defaultPet() }
}

function savePet(data) {
  try { localStorage.setItem(PET_KEY, JSON.stringify({ ...data, lastUpdatedAt: Date.now() })) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE-CONSISTENT MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
function pickMessage(petState, hunger, mood, energy) {
  if (petState === 'veryHungry') return ["I'm starving... 😿", "Please feed me!! 🍜", "I'm so weak... 😢"]
  if (petState === 'hungry')     return ["I'm hungry... 😿", "Feed me please! 🍜", "My tummy hurts..."]
  if (petState === 'sleeping')   return ["zzz... 😴", "*snores softly*"]
  if (petState === 'eating')     return ["Yum! Thank you! 💕", "Nom nom nom~ 😋", "So delicious! ✨"]
  if (petState === 'playing')    return ["Wheee!! 😸", "So fun! ✨", "Again! Again! 🧶"]
  if (petState === 'scratching') return ["Ahh~ that's the spot! 😼", "*scratch scratch*"]
  if (energy < 20)  return ["So sleepy... 😴", "I need a nap..."]
  if (mood < 30)    return ["I'm bored... 😐", "Can we play? 🧶"]
  return ["Purr~ 💕", "I love you! 😊", "*stretches lazily* 😺", "Meow~ 🐱", "Head bumps! 💕"]
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE CAT — image-based, state-aware, animated
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_CFG = {
  walking:    { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  sleeping:   { src: '/sprites/sleep.png',   frames: 4, origH: 123 },
  eating:     { src: '/sprites/eat.png',     frames: 5, origH: 188 },
  playing:    { src: '/sprites/play.png',    frames: 5, origH: 200 },
  scratching: { src: '/sprites/scratch.png', frames: 5, origH: 247 },
  idle:       { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  hungry:     { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  veryHungry: { src: '/sprites/walk.png',    frames: 5, origH: 185 },
}
const ORIG_STRIP_W = 1408

function CatSprite({ state, isWalking }) {
  const key = isWalking ? 'walking' : (SPRITE_CFG[state] ? state : 'idle')
  const cfg = SPRITE_CFG[key]
  const origFrameW = ORIG_STRIP_W / cfg.frames
  const scale = CAT_W / origFrameW
  const dispH = Math.round(cfg.origH * scale)
  const totalW = CAT_W * cfg.frames
  const animated = key !== 'idle' && key !== 'hungry' && key !== 'veryHungry'
  return (
    <div
      className={animated ? `cat-sprite-anim-${key}` : ''}
      style={{
        width: CAT_W, height: dispH,
        backgroundImage: `url('${cfg.src}')`,
        backgroundSize: `${totalW}px ${dispH}px`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '0 0',
        imageRendering: 'auto',
      }}
    />
  )
}

// Legacy — kept to avoid parse errors but unused
function CatSVG({ state }) {
  const isSleep    = state === 'sleeping'
  const isHungry   = state === 'hungry' || state === 'veryHungry'
  const isVeryHung = state === 'veryHungry'
  const isEating   = state === 'eating'
  const isPlaying  = state === 'playing'
  const isHappy    = isEating || isPlaying

  // eye style
  let eyes
  if (isSleep) {
    eyes = (
      <>
        <path d="M41,43 Q45,40 49,43" stroke="#4A3020" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M59,43 Q63,40 67,43" stroke="#4A3020" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>
    )
  } else if (isHappy) {
    eyes = (
      <>
        <path d="M41,44 Q45,40 49,44" stroke="#4A3020" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M59,44 Q63,40 67,44" stroke="#4A3020" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>
    )
  } else if (isVeryHung) {
    eyes = (
      <>
        {/* sad drooping eyes */}
        <ellipse cx="45" cy="44" rx="5" ry="4" fill="#3A2810"/>
        <ellipse cx="63" cy="44" rx="5" ry="4" fill="#3A2810"/>
        <ellipse cx="43" cy="42" rx="1.5" ry="1" fill="white"/>
        <ellipse cx="61" cy="42" rx="1.5" ry="1" fill="white"/>
        {/* worried brows */}
        <path d="M40,38 Q45,36 50,38" stroke="#8B6A4A" strokeWidth="1.5" fill="none"/>
        <path d="M58,38 Q63,36 68,38" stroke="#8B6A4A" strokeWidth="1.5" fill="none"/>
      </>
    )
  } else if (isHungry) {
    eyes = (
      <>
        <ellipse cx="45" cy="43" rx="5" ry="5" fill="#3A2810"/>
        <ellipse cx="63" cy="43" rx="5" ry="5" fill="#3A2810"/>
        <ellipse cx="43" cy="41" rx="1.8" ry="1.8" fill="white"/>
        <ellipse cx="61" cy="41" rx="1.8" ry="1.8" fill="white"/>
        {/* slight brow furrow */}
        <path d="M41,37 Q45,35 49,37" stroke="#8B6A4A" strokeWidth="1.2" fill="none"/>
        <path d="M59,37 Q63,35 67,37" stroke="#8B6A4A" strokeWidth="1.2" fill="none"/>
      </>
    )
  } else {
    eyes = (
      <>
        <ellipse cx="45" cy="43" rx="5.5" ry="5.5" fill="#3A2810"/>
        <ellipse cx="63" cy="43" rx="5.5" ry="5.5" fill="#3A2810"/>
        <ellipse cx="43" cy="41" rx="1.8" ry="1.8" fill="white"/>
        <ellipse cx="61" cy="41" rx="1.8" ry="1.8" fill="white"/>
      </>
    )
  }

  if (isSleep) {
    return (
      <svg viewBox="0 0 100 90" width={CAT_W} height={CAT_H} xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible', background: 'transparent' }}>
        {/* Curled sleeping cat */}
        <ellipse cx="50" cy="65" rx="38" ry="22" fill="#C4A880" stroke="#8B6A4A" strokeWidth="1"/>
        <ellipse cx="50" cy="62" rx="26" ry="14" fill="#E0C8A0"/>
        {/* Head tucked */}
        <circle  cx="72" cy="60" r="18" fill="#C4A880" stroke="#8B6A4A" strokeWidth="1"/>
        {/* Ears */}
        <polygon points="62,46 57,36 68,44" fill="#B89060" stroke="#8B6A4A" strokeWidth="0.8"/>
        <polygon points="82,44 87,34 78,42" fill="#B89060" stroke="#8B6A4A" strokeWidth="0.8"/>
        {/* Eyes closed */}
        <path d="M65,58 Q68,55 71,58" stroke="#4A3020" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        <path d="M73,58 Q76,55 79,58" stroke="#4A3020" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        {/* Nose */}
        <ellipse cx="72" cy="64" rx="2.5" ry="1.8" fill="#E08080"/>
        {/* Tail */}
        <path d="M15,68 Q5,55 12,45 Q18,38 25,46" stroke="#B89060" strokeWidth="9" fill="none" strokeLinecap="round"/>
        <path d="M15,68 Q5,55 12,45 Q18,38 25,46" stroke="#D4B880" strokeWidth="6" fill="none" strokeLinecap="round"/>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 100 120" width={CAT_W} height={CAT_H} xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible', background: 'transparent' }}>
      {/* Body */}
      <ellipse cx="50" cy={isVeryHung ? 84 : 80} rx="28" ry={isVeryHung ? 24 : 26} fill="#C4A880" stroke="#8B6A4A" strokeWidth="1.2"/>
      {/* Belly */}
      <ellipse cx="50" cy={isVeryHung ? 87 : 84} rx="16" ry={isVeryHung ? 14 : 16} fill="#E0C8A0"/>

      {/* Head */}
      <circle cx="50" cy="42" r="22" fill="#C4A880" stroke="#8B6A4A" strokeWidth="1.2"/>

      {/* Ears */}
      <polygon points="32,26 25,12 40,22" fill="#B89060" stroke="#8B6A4A" strokeWidth="1"/>
      <polygon points="34,26 29,14 40,22" fill="#F0A0A0"/>
      <polygon points="68,26 75,12 60,22" fill="#B89060" stroke="#8B6A4A" strokeWidth="1"/>
      <polygon points="66,26 71,14 60,22" fill="#F0A0A0"/>

      {/* Eyes */}
      {eyes}

      {/* Nose */}
      <ellipse cx="50" cy="51" rx="3" ry="2" fill={isHungry ? "#C06060" : "#E08080"}/>

      {/* Mouth */}
      {isVeryHung
        ? <path d="M46,55 Q50,58 54,55" stroke="#8B5050" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        : isHungry
        ? <path d="M47,54 Q50,57 53,54" stroke="#8B6A4A" strokeWidth="1" fill="none" strokeLinecap="round"/>
        : <path d="M47,53 Q50,55 53,53" stroke="#8B6A4A" strokeWidth="1" fill="none" strokeLinecap="round"/>
      }

      {/* Whiskers */}
      <line x1="24" y1="50" x2="42" y2="52" stroke="#8B6A4A" strokeWidth="0.8" opacity="0.7"/>
      <line x1="24" y1="54" x2="42" y2="54" stroke="#8B6A4A" strokeWidth="0.8" opacity="0.7"/>
      <line x1="76" y1="50" x2="58" y2="52" stroke="#8B6A4A" strokeWidth="0.8" opacity="0.7"/>
      <line x1="76" y1="54" x2="58" y2="54" stroke="#8B6A4A" strokeWidth="0.8" opacity="0.7"/>

      {/* Collar (hide when very hungry for sadder look) */}
      {!isVeryHung && (
        <>
          <rect x="36" y="61" width="28" height="7" rx="3.5" fill="#D44A4A" stroke="#A03030" strokeWidth="0.8"/>
          <circle cx="50" cy="64.5" r="3.5" fill="#F0C030" stroke="#B08000" strokeWidth="0.8"/>
        </>
      )}

      {/* Stripes */}
      <path d="M38,32 Q40,27 42,32" stroke="#A88A6A" strokeWidth="1" fill="none"/>
      <path d="M49,28 Q51,23 53,28" stroke="#A88A6A" strokeWidth="1" fill="none"/>
      <path d="M60,32 Q62,27 64,32" stroke="#A88A6A" strokeWidth="1" fill="none"/>

      {/* Tail */}
      <path d="M24,88 Q8,76 10,60 Q14,48 22,55"
        stroke="#A8896A" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M24,88 Q8,76 10,60 Q14,48 22,55"
        stroke="#C4A880" strokeWidth="5" fill="none" strokeLinecap="round"/>

      {/* Paws */}
      <ellipse cx="38" cy="104" rx="9" ry="6"   fill="#B89870" stroke="#8B6A4A" strokeWidth="1"/>
      <ellipse cx="62" cy="104" rx="9" ry="6"   fill="#B89870" stroke="#8B6A4A" strokeWidth="1"/>
      <ellipse cx="38" cy="102" rx="7" ry="4.5" fill="#C4A880"/>
      <ellipse cx="62" cy="102" rx="7" ry="4.5" fill="#C4A880"/>

      {/* Tummy spots (very hungry — visible ribs suggestion) */}
      {isVeryHung && (
        <>
          <line x1="42" y1="76" x2="42" y2="85" stroke="#B89060" strokeWidth="0.8" opacity="0.4"/>
          <line x1="50" y1="74" x2="50" y2="86" stroke="#B89060" strokeWidth="0.8" opacity="0.4"/>
          <line x1="58" y1="76" x2="58" y2="85" stroke="#B89060" strokeWidth="0.8" opacity="0.4"/>
        </>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE LABELS
// ─────────────────────────────────────────────────────────────────────────────
const STATE_LABEL = {
  idle:       { text: 'Relaxing 😌',      color: '#5A8A5A', bg: '#E8F5E9' },
  walking:    { text: 'On the way 🐾',    color: '#4A7A9A', bg: '#E8F4FA' },
  sleeping:   { text: 'Sleeping 😴',      color: '#4A5AAA', bg: '#EEF0FA' },
  hungry:     { text: 'Hungry 😿',        color: '#C05A00', bg: '#FFF3E0' },
  veryHungry: { text: 'Starving!! 😿',    color: '#B02020', bg: '#FEECEB' },
  eating:     { text: 'Eating 😋',        color: '#B84A00', bg: '#FFF3E0' },
  playing:    { text: 'Playing 😸',       color: '#2A7A3A', bg: '#E8F5E9' },
  scratching: { text: 'Scratching 😼',    color: '#6A1B9A', bg: '#F5EEF8' },
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────
function getRecommendation(fullness, energy, mood, ce) {
  if (fullness < 30) {
    if (ce < FEED_COST) return {
      type: 'urgent', action: 'feed',
      msg: "Your cat is hungry. Scan a meal to earn Care Energy ⚡ and feed it."
    }
    return { type: 'feed', action: 'feed', msg: "Your cat looks hungry. Feed it now." }
  }
  if (energy < 30) return { type: 'rest', action: 'rest', msg: "Your cat is tired. Let it rest to recover Energy." }
  if (mood < 40)   return { type: 'play', action: 'play', msg: "Your cat looks bored. Play with it!" }
  return { type: 'ok', action: null, msg: null }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MyRoom({ avatar, xp, streak, mealCount, level, onClose }) {
  // ── Pet state ──────────────────────────────────────────────────────────────
  const [inited,     setInited]     = useState(false)
  const [petState,   setPetState]   = useState('idle')
  const [catPos,     setCatPos]     = useState({ x: 47, y: 8 })
  const [hunger,     setHunger]     = useState(20)
  const [mood,       setMood]       = useState(70)
  const [energy,     setEnergy]     = useState(80)
  const [isWalking,  setIsWalking]  = useState(false)
  const [flipX,      setFlipX]      = useState(false)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [message,     setMessage]     = useState(null)
  const [showMsg,     setShowMsg]     = useState(false)
  const [xpFlash,     setXpFlash]     = useState(null)
  const [wakeDialog,  setWakeDialog]  = useState(false)
  const [careEnergy,  setCareEnergy]  = useState(loadCE)   // Care Energy — local only
  const [hearts,      setHearts]      = useState([])       // [{id,offsetX}]
  const [equippedTheme, setEquippedTheme] = useState(() => {
    try { return localStorage.getItem('zp_theme') || 'japandi' } catch { return 'japandi' }
  })
  const [equippedAcc, setEquippedAcc] = useState(() => {
    try { return localStorage.getItem('zp_acc') || 'green_collar' } catch { return 'green_collar' }
  })

  // ── Purchased supplies (from Star shop) ───────────────────────────────────
  const purchased = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('zp_purchased') || '[]') } catch { return [] }
  }, [])
  const purchasedRef = useRef(purchased)
  const hasPurchased = useCallback((id) => purchasedRef.current.includes(id), [])

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const p = loadPet()
    setPetState(p.petState)
    setCatPos(p.pos || { x: 47, y: 8 })
    setHunger(p.hunger)
    setMood(p.mood)
    setEnergy(p.energy)
    setFlipX(p.flipX || false)
    setInited(true)
  }, [])

  // ── Refs (avoid stale closures) ───────────────────────────────────────────
  const stateRef   = useRef('idle')
  const hungerRef  = useRef(20)
  const energyRef  = useRef(80)
  const isWalkRef  = useRef(false)
  const catPosRef  = useRef({ x: 47, y: 8 })

  const msgTimer    = useRef(null)
  const stateTimer  = useRef(null)
  const walkTimer   = useRef(null)
  const scratchTimer= useRef(null)
  const wanderTimer = useRef(null)
  const stateStarted = useRef(Date.now())
  const stateDurRef  = useRef(null)

  useEffect(() => { stateRef.current  = petState  }, [petState])
  useEffect(() => { hungerRef.current = hunger    }, [hunger])
  useEffect(() => { energyRef.current = energy    }, [energy])
  useEffect(() => { isWalkRef.current = isWalking }, [isWalking])
  useEffect(() => { catPosRef.current = catPos    }, [catPos])

  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    savePet({ petState, pos: catPos, hunger, mood, energy, flipX,
      stateStartedAt: stateStarted.current, stateDuration: stateDurRef.current })
  }, [petState, hunger, mood, energy, catPos, flipX, inited])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const bubble = useCallback((msg, ms = 2800) => {
    clearTimeout(msgTimer.current)
    setMessage(msg); setShowMsg(true)
    msgTimer.current = setTimeout(() => setShowMsg(false), ms)
  }, [])

  const scheduleIdle = useCallback((key) => {
    clearTimeout(stateTimer.current)
    const ms = STATE_DURATION[key] || 4000
    stateStarted.current = Date.now()
    stateDurRef.current  = ms
    stateTimer.current = setTimeout(() => {
      setPetState('idle'); stateDurRef.current = null
    }, ms)
  }, [])

  const walkTo = useCallback((dest, cb) => {
    clearTimeout(walkTimer.current)
    const cur  = catPosRef.current
    const dx   = dest.x - cur.x
    const dist = Math.sqrt(dx * dx + (dest.y - cur.y) ** 2)
    catPosRef.current = dest
    setCatPos(dest)
    if (dist < 4) { cb?.(); return }
    setFlipX(dx < 0); setIsWalking(true)
    // Timer must be ≥ CSS transition (1.3s). dist*60 adds extra time for longer walks.
    walkTimer.current = setTimeout(() => {
      setIsWalking(false); setFlipX(false); cb?.()
    }, Math.max(1300, dist * 60))
  }, [])

  const spendCE = useCallback((amount) => {
    const curr = loadCE()
    if (curr < amount) return false
    const next = curr - amount
    saveCE(next)
    setCareEnergy(next)
    setXpFlash(`-${amount} ⚡`)
    setTimeout(() => setXpFlash(null), 1800)
    return true
  }, [])

  // ── Hearts ────────────────────────────────────────────────────────────────
  const showHearts = useCallback(() => {
    const id  = Date.now()
    const batch = [{ id, offsetX: -18 }, { id: id+1, offsetX: 0 }, { id: id+2, offsetX: 18 }]
    setHearts(h => [...h, ...batch])
    setTimeout(() => setHearts(h => h.filter(x => !batch.find(b => b.id === x.id))), 1400)
  }, [])

  // ── Auto-scratch (only when scratching board is owned) ───────────────────
  const scheduleAutoScratch = useCallback(() => {
    clearTimeout(scratchTimer.current)
    scratchTimer.current = setTimeout(() => {
      if (stateRef.current === 'idle' && !isWalkRef.current && purchasedRef.current.includes('scratching_board')) {
        walkTo(OBJ.scratch, () => {
          setPetState('scratching')
          setMood(m => Math.min(m + 6, 100))
          bubble("😼 Ahh~ that's the spot!", 2800)
          scheduleIdle('scratching')
        })
      }
    }, 30000 + Math.random() * 40000)
  }, [walkTo, bubble, scheduleIdle])

  useEffect(() => {
    if (!inited) return
    if (petState === 'idle') scheduleAutoScratch()
    else clearTimeout(scratchTimer.current)
  }, [petState, inited, scheduleAutoScratch])

  // ── Random wander (Animal Crossing–style) ─────────────────────────────────
  useEffect(() => {
    if (!inited) return
    const BUSY = ['sleeping', 'eating', 'playing', 'scratching']
    const doWander = () => {
      if (!BUSY.includes(stateRef.current) && !isWalkRef.current) {
        const x = 15 + Math.random() * 65  // keep cat 15–80% — away from edges
        walkTo({ x, y: 8 }, () => {
          // Arrived: pause naturally, then wander again
          wanderTimer.current = setTimeout(doWander, 2000 + Math.random() * 2000)
        })
      } else {
        // Cat is busy or mid-walk — check again shortly
        wanderTimer.current = setTimeout(doWander, 1500)
      }
    }
    wanderTimer.current = setTimeout(doWander, 800)
    return () => clearTimeout(wanderTimer.current)
  }, [inited, walkTo])

  // ── Game tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    const tick = setInterval(() => {
      const s = stateRef.current
      const hasBowl    = purchasedRef.current.includes('water_bowl')
      const hasBlanket = purchasedRef.current.includes('blanket')
      const hasBed     = purchasedRef.current.includes('cat_bed')

      if (s !== 'eating')    setHunger(h => Math.min(h + (hasBowl ? 1.5 : 2), 100))
      if (s === 'sleeping')  setEnergy(e => Math.min(e + (hasBlanket || hasBed ? 4 : 3), 100))
      else if (s !== 'idle') setEnergy(e => Math.max(e - 1, 0))

      const h = hungerRef.current
      const e = energyRef.current

      // Auto-sleep (goes to bed if owned, otherwise sleeps in place)
      if (e <= 10 && s === 'idle') {
        if (hasBed) {
          walkTo(OBJ.bed, () => {
            setPetState('sleeping'); stateDurRef.current = null
            bubble('😴 Crawling into bed... zzz', 3000)
          })
        } else {
          setPetState('sleeping'); stateDurRef.current = null
          bubble('😴 So sleepy... zzz', 2500)
        }
        return
      }

      // Hunger state transitions — only walk to bowl on first transition
      if (h >= 90 && s !== 'eating' && s !== 'sleeping') {
        if (s !== 'veryHungry') {
          setPetState('veryHungry')
          walkTo(OBJ.bowl, () => {})
          bubble("I'm starving... 😿 Please feed me!!", 4500)
        }
      } else if (h >= 70 && s !== 'eating' && s !== 'sleeping' && s !== 'veryHungry' && s !== 'hungry') {
        setPetState('hungry')
        walkTo(OBJ.bowl, () => {})
        bubble("I'm hungry... 😿", 3500)
      } else if (h < 35 && (s === 'hungry' || s === 'veryHungry')) {
        setPetState('idle')
      }
    }, 5000)

    return () => {
      clearInterval(tick)
      clearTimeout(msgTimer.current); clearTimeout(stateTimer.current)
      clearTimeout(walkTimer.current); clearTimeout(scratchTimer.current)
      clearTimeout(wanderTimer.current)
    }
  }, [inited, walkTo, bubble])

  // ── FEED ──────────────────────────────────────────────────────────────────
  const handleFeed = () => {
    if (isWalking) return
    if (petState === 'sleeping') {
      clearTimeout(stateTimer.current); setPetState('idle')
      bubble('😴 Mmm... food?', 1400)
      setTimeout(doFeed, 1500); return
    }
    doFeed()
  }

  const doFeed = () => {
    if (!spendCE(FEED_COST)) return
    clearTimeout(stateTimer.current); clearTimeout(scratchTimer.current)
    const hasCan    = purchasedRef.current.includes('premium_can')
    const feedAmt   = hasCan ? 60 : 45
    walkTo(OBJ.bowl, () => {
      setPetState('eating')
      setHunger(h => Math.max(0, h - feedAmt))
      setMood(m   => Math.min(m + 10, 100))
      bubble(`😋 Yum! Fullness +${feedAmt} 💕`, 3500)
      showHearts()
      scheduleIdle('eating')
    })
  }

  // ── PLAY ──────────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (isWalking) return
    if (petState === 'sleeping') { setWakeDialog(true); return }
    if (energyRef.current < 20) { bubble('😴 Too tired... let me rest.', 3000); return }
    if (petState === 'hungry' || petState === 'veryHungry') {
      bubble("😿 Too hungry to play! Feed me first!", 2800); return
    }
    if (petState === 'playing') { bubble('😸 Already playing!', 1500); return }
    doPlay()
  }

  const doPlay = () => {
    if (!spendCE(PLAY_COST)) return
    clearTimeout(stateTimer.current); clearTimeout(scratchTimer.current)
    const dest = purchasedRef.current.includes('toy_mouse') ? OBJ.toy : OBJ.center
    walkTo(dest, () => {
      setPetState('playing')
      setMood(m   => Math.min(m + 20, 100))
      setEnergy(e => Math.max(e - 18, 0))
      bubble('😸 Wheee!! So fun! ✨', 3000)
      scheduleIdle('playing')
    })
  }

  const confirmWake = () => {
    setWakeDialog(false); clearTimeout(stateTimer.current); setPetState('idle')
    bubble("😺 Okay okay, I'm up!", 1400)
    setTimeout(doPlay, 1500)
  }

  // ── REST (free, no CE cost) ────────────────────────────────────────────────
  const handleRest = () => {
    if (petState === 'sleeping') { bubble('Already sleeping~ zzz 😴', 1500); return }
    clearTimeout(stateTimer.current); clearTimeout(scratchTimer.current)
    if (purchasedRef.current.includes('cat_bed')) {
      walkTo(OBJ.bed, () => {
        setPetState('sleeping'); stateDurRef.current = null
        bubble('😴 Taking a nap in bed...', 2500)
      })
    } else {
      setPetState('sleeping'); stateDurRef.current = null
      bubble('😴 Taking a little rest...', 2500)
    }
  }

  // ── Cat click ─────────────────────────────────────────────────────────────
  const handleCatClick = () => {
    if (isWalking) return
    if (petState === 'sleeping') { clearTimeout(stateTimer.current); setPetState('idle'); bubble('😺 Good morning! ☀️', 2000); return }
    if (petState === 'eating')     { bubble('😋 Eating, give me a sec~', 1500); return }
    if (petState === 'playing')    { bubble('😸 Busy playing!', 1500); return }
    if (petState === 'scratching') { bubble('😼 Scratching, ahh~', 1500); return }
    const msgs = pickMessage(petState, hunger, mood, energy)
    bubble(msgs[Math.floor(Math.random() * msgs.length)])
    if (petState !== 'hungry' && petState !== 'veryHungry') {
      const hasBrush = purchasedRef.current.includes('brush')
      setMood(m => Math.min(m + (hasBrush ? 10 : 5), 100))
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayState  = isWalking ? 'walking' : petState
  const label         = STATE_LABEL[displayState] || STATE_LABEL.idle
  const canFeed       = careEnergy >= FEED_COST
  const canPlay       = careEnergy >= PLAY_COST && energy >= 20
  const fullness      = 100 - hunger   // flip: higher = fuller (intuitive)
  const fullnessColor = fullness >= 70 ? '#43A047' : fullness >= 30 ? '#FB8C00' : '#E53935'
  const moodColor     = mood   >= 60 ? '#43A047' : mood   >= 30 ? '#FB8C00' : '#E53935'
  const energyColor   = energy >= 60 ? '#2196F3' : energy >= 30 ? '#FF9800' : '#9E9E9E'
  const activeAcc     = ACCESSORIES.find(a => a.id === equippedAcc)

  if (!inited) return null

  // Bubble Y position: clamp so it never gets clipped by scene top
  // Scene = 300px tall. Cat is at bottom: catPos.y%, height ~CAT_H px
  // Bubble is ~60px tall. Keep bubble bottom >= 60px from scene top = within scene.
  const scenePx = 300
  const catBottomPx  = catPos.y / 100 * scenePx          // px from scene bottom
  const catTopPx     = catBottomPx + CAT_H + 30           // px from scene bottom (above cat)
  const maxBubbleBottom = scenePx - 70                    // bubble must stay ≤ this from bottom
  const bubbleBottom = Math.min(catTopPx, maxBubbleBottom) // clamp

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="rm-bg" onClick={onClose}>
      <div className="rm-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="rm-header">
          <div className="rm-header-left">
            <span className="rm-title">🐱 My Room</span>
            <span className="rm-room-lv">Bond Lv.{level || 1}</span>
          </div>
          <div className="rm-xp" title="Scan a meal to earn Care Energy ⚡">
            <span>⚡</span>
            <span>{careEnergy}</span>
          </div>
          <button className="rm-close" onClick={onClose}>✕</button>
        </div>

        {/* ── SCENE ──────────────────────────────────────────────────────── */}
        <div className="rm-scene">

          {/* Room layers */}
          <div className="rm-ceiling"/>
          <div className="rm-wall"/>
          <div className="rm-baseboard"/>
          <div className="rm-floor"/>

          {/* Purchased cat supplies — appear in room */}
          {purchased.includes('toy_mouse') && (
            <div className="rm-floor-obj" style={{ left:`${OBJ.toy.x}%`, bottom:`${OBJ.toy.y}%` }}>
              <div className={`rm-obj-icon ${petState === 'playing' ? 'rm-ball-active' : ''}`}>🐭</div>
            </div>
          )}
          {purchased.includes('scratching_board') && (
            <div className="rm-floor-obj" style={{ left:`${OBJ.scratch.x}%`, bottom:`${OBJ.scratch.y}%` }}>
              <div className={`rm-obj-icon ${petState === 'scratching' ? 'rm-ball-active' : ''}`}>🪵</div>
            </div>
          )}
          {purchased.includes('cat_bed') && (
            <div className="rm-floor-obj" style={{ left:`${OBJ.bed.x + 3}%`, bottom:`${OBJ.bed.y}%` }}>
              <div className="rm-obj-icon">🛏️</div>
            </div>
          )}
          {purchased.includes('blanket') && purchased.includes('cat_bed') && (
            <div className="rm-floor-obj" style={{ left:`${OBJ.bed.x + 8}%`, bottom:`${OBJ.bed.y - 2}%` }}>
              <div className="rm-obj-icon">🧣</div>
            </div>
          )}
          {purchased.includes('water_bowl') && (
            <div className="rm-floor-obj" style={{ left:`${OBJ.bowl.x + 3}%`, bottom:`${OBJ.bowl.y + 2}%` }}>
              <div className="rm-obj-icon">💧</div>
            </div>
          )}
          {purchased.includes('window_cushion') && (
            <div className="rm-floor-obj" style={{ left:'82%', bottom:'35%' }}>
              <div className="rm-obj-icon">🪟</div>
            </div>
          )}

          {/* ── SPEECH BUBBLE (clamped, never clipped) ── */}
          {showMsg && (
            <div
              className="rm-bubble"
              style={{
                left:   `${catPos.x}%`,
                bottom: `${bubbleBottom}px`,
              }}
            >
              {message}
              <span className="rm-bubble-tail"/>
            </div>
          )}

          {/* ── CAT ── */}
          <div
            className="rm-cat"
            style={{
              left:             `${catPos.x}%`,
              bottom:           `${catPos.y}%`,
              transform:        `translateX(-50%) scaleX(${flipX ? -1 : 1})`,
              transformOrigin:  'bottom center',
            }}
            onClick={handleCatClick}
          >
            {/* Zzz */}
            {petState === 'sleeping' && !isWalking && (
              <div className="rm-zzz-wrap">
                <span className="rm-zzz z1">z</span>
                <span className="rm-zzz z2">z</span>
                <span className="rm-zzz z3">Z</span>
              </div>
            )}

            {/* Hearts */}
            {hearts.map(h => (
              <div key={h.id} className="rm-heart" style={{ left: `calc(50% + ${h.offsetX}px)` }}>💕</div>
            ))}

            {/* Sprite cat — image-based animation */}
            <div className="rm-cat-body">
              <CatSprite state={petState} isWalking={isWalking}/>
            </div>

            {/* Accessory overlay — outside rm-cat-body to avoid overflow:hidden clipping */}
            {activeAcc?.dispEmoji && (
              <div className="rm-cat-acc">{activeAcc.dispEmoji}</div>
            )}

            {/* Floor shadow */}
            <div className="rm-cat-shadow"/>
          </div>

          {/* XP flash */}
          {xpFlash && <div className="rm-xp-flash">{xpFlash}</div>}

          {/* ── Wake dialog (inside scene so position:absolute anchors correctly) */}
          {wakeDialog && (
            <div className="rm-wake-dialog">
              <p>😴 The cat is sleeping...<br/>Wake up and play?</p>
              <div className="rm-wake-btns">
                <button className="rm-wake-yes" onClick={confirmWake}>Yes, wake up!</button>
                <button className="rm-wake-no"  onClick={() => setWakeDialog(false)}>Let it sleep</button>
              </div>
            </div>
          )}

        </div>{/* end rm-scene */}

        {/* ── SCROLLABLE BOTTOM ──────────────────────────────────────────── */}
        <div className="rm-body">

          {/* Cat status — compact bars */}
          <div className="rm-stats">
            {[
              { icon: '🍚', label: 'Fullness', val: fullness, color: fullnessColor },
              { icon: '💕', label: 'Mood',     val: mood,     color: moodColor     },
              { icon: '⚡', label: 'Energy',   val: energy,   color: energyColor   },
            ].map(({ icon, label: lbl, val, color }) => (
              <div key={lbl} className="rm-stat-row">
                <span className="rm-stat-lbl">{icon} {lbl}</span>
                <div className="rm-stat-track">
                  <div className="rm-stat-fill" style={{ width:`${val}%`, background: color }}/>
                </div>
                <span className="rm-stat-num" style={{ color }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Smart recommendation banner */}
          {(() => {
            const rec = getRecommendation(fullness, energy, mood, careEnergy)
            if (!rec.msg) return null
            return (
              <div className={`rm-rec ${rec.type === 'urgent' || rec.type === 'feed' ? 'rm-rec-urgent' : 'rm-rec-soft'}`}>
                <span className="rm-rec-icon">
                  {rec.action === 'feed' ? '🍚' : rec.action === 'rest' ? '😴' : '🧶'}
                </span>
                <p className="rm-rec-msg">{rec.msg}</p>
              </div>
            )
          })()}

          {/* Care actions */}
          {(() => {
            const rec = getRecommendation(fullness, energy, mood, careEnergy)
            const feedAmt = purchased.includes('premium_can') ? 60 : 45
            const restDisabled = energy >= 100 || petState === 'sleeping'
            return (
              <div className="rm-actions">

                {/* Feed */}
                <button
                  className={`rm-action-btn ${rec.action === 'feed' ? 'rm-action-primary' : ''}`}
                  onClick={handleFeed}
                  disabled={!canFeed}
                >
                  <span className="rm-action-icon">🍚</span>
                  <div className="rm-action-info">
                    <span className="rm-action-label">Feed</span>
                    <span className="rm-action-sub">
                      {canFeed ? `Fullness +${feedAmt}` : 'Scan a meal to earn Care Energy ⚡'}
                    </span>
                  </div>
                  <span className={`rm-action-tag ${canFeed ? 'rm-tag-cost' : 'rm-tag-locked'}`}>
                    {canFeed ? '20 ⚡' : 'Need 20 ⚡'}
                  </span>
                </button>

                {/* Play */}
                <button
                  className={`rm-action-btn ${rec.action === 'play' ? 'rm-action-primary' : ''}`}
                  onClick={handlePlay}
                  disabled={!canPlay}
                >
                  <span className="rm-action-icon">{purchased.includes('toy_mouse') ? '🐭' : '🧶'}</span>
                  <div className="rm-action-info">
                    <span className="rm-action-label">Play</span>
                    <span className="rm-action-sub">
                      {canPlay
                        ? 'Mood +20'
                        : energy < 20
                          ? 'Your cat is too tired to play'
                          : 'Scan a meal to earn Care Energy ⚡'}
                    </span>
                  </div>
                  <span className={`rm-action-tag ${canPlay ? 'rm-tag-cost' : 'rm-tag-locked'}`}>
                    {canPlay ? '15 ⚡' : energy < 20 ? 'Rest first' : 'Need 15 ⚡'}
                  </span>
                </button>

                {/* Rest */}
                <button
                  className={`rm-action-btn ${rec.action === 'rest' ? 'rm-action-primary' : ''}`}
                  onClick={handleRest}
                  disabled={restDisabled}
                >
                  <span className="rm-action-icon">😴</span>
                  <div className="rm-action-info">
                    <span className="rm-action-label">Rest</span>
                    <span className="rm-action-sub">
                      {energy >= 100
                        ? 'Energy is already full'
                        : petState === 'sleeping'
                          ? 'Your cat is sleeping'
                          : 'Let your cat rest to recover Energy'}
                    </span>
                  </div>
                  <span className="rm-action-tag rm-tag-free">Free</span>
                </button>

              </div>
            )
          })()}

          {/* Daily quote */}
          <div className="rm-quote">
            <p className="rm-quote-text">✨ "{getDailyQuote()}"</p>
          </div>

        </div>{/* end rm-body */}
      </div>
    </div>,
    document.body
  )
}
