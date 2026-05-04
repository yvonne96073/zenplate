import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

const DICEBEAR = (seed) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=2BB5A0&textColor=ffffff&fontSize=40`

// ── Constants ─────────────────────────────────────────────────────────────────
const PET_KEY   = 'zp_pet_v2'
const PROG_KEY  = 'zp_progress_v1'
const FEED_COST = 30
const PLAY_COST = 20
const STATE_DURATION = { eating: 5000, playing: 8000, scratching: 6000 }

const OBJ_POS = {
  bowl:    { x: 35, y: 10 },
  toy:     { x: 60, y: 10 },
  scratch: { x: 14, y: 12 },
  center:  { x: 45, y: 10 },
  bed:     { x: 7,  y: 28 },
}

// ── Sprite sheet config ───────────────────────────────────────────────────────
const CAT_SPRITE  = '/cat.png'
const ORIG_IMG_W  = 677
const ORIG_CELL_W = 225.7
const ORIG_CELL_H = 231.5
const DISP_W = 110
const S      = DISP_W / ORIG_CELL_W
const DISP_H = Math.round(ORIG_CELL_H * S)
const BG_W   = Math.round(ORIG_IMG_W * S)

const POSE = {
  idle:       { col: 0, row: 0 },
  walking:    { col: 1, row: 0 },
  sleeping:   { col: 2, row: 0 },
  eating:     { col: 0, row: 1 },
  playing:    { col: 1, row: 1 },
  scratching: { col: 2, row: 1 },
  hungry:     { col: 0, row: 0 },
}

// ── Unlock milestones (room progression) ─────────────────────────────────────
export const UNLOCK_MILESTONES = [
  { id: 'scratchPost', emoji: '🪵', name: 'Scratch Post', req: '3 feeds',   check: (p)      => p.feedCount >= 3  },
  { id: 'toy',         emoji: '🧶', name: 'Yarn Toy',     req: '5 plays',   check: (p)      => p.playCount >= 5  },
  { id: 'bed',         emoji: '🛏️', name: 'Cat Bed',      req: '3d streak', check: (p, str) => str >= 3          },
  { id: 'plant',       emoji: '🪴', name: 'Potted Plant', req: '10 feeds',  check: (p)      => p.feedCount >= 10 },
  { id: 'lamp',        emoji: '🪔', name: 'Floor Lamp',   req: '10 plays',  check: (p)      => p.playCount >= 10 },
  { id: 'painting',    emoji: '🖼️', name: 'Wall Art',     req: '20 feeds',  check: (p)      => p.feedCount >= 20 },
  { id: 'bookshelf',   emoji: '📚', name: 'Bookshelf',    req: '7d streak', check: (p, str) => str >= 7          },
  { id: 'sofa',        emoji: '🛋️', name: 'Cozy Sofa',   req: '30 feeds',  check: (p)      => p.feedCount >= 30 },
  { id: 'aquarium',    emoji: '🐠', name: 'Aquarium',     req: '30 plays',  check: (p)      => p.playCount >= 30 },
]

// Keep export for Profile.jsx compatibility
export const ROOM_ITEMS = UNLOCK_MILESTONES

// ── Persistence: pet state ────────────────────────────────────────────────────
function getDefaultPetData() {
  return {
    petState: 'idle', pos: { x: 45, y: 10 },
    hunger: 20, mood: 70, energy: 80, flipX: false,
    stateStartedAt: Date.now(), stateDuration: null, lastUpdatedAt: Date.now(),
  }
}

function loadPetData() {
  try {
    const raw = localStorage.getItem(PET_KEY)
    if (!raw) return getDefaultPetData()
    const saved = JSON.parse(raw)
    const now = Date.now()
    const elapsedMs = now - (saved.lastUpdatedAt || now)
    const ticks = Math.min(Math.floor(elapsedMs / 5000), 720)
    let { petState, hunger, mood, energy, stateStartedAt, stateDuration } = saved
    for (let i = 0; i < ticks; i++) {
      if (petState !== 'eating')   hunger  = Math.min(hunger + 2, 100)
      if (petState === 'sleeping') energy  = Math.min(energy + 3, 100)
      else                         energy  = Math.max(energy - 0.2, 0)
    }
    if (stateDuration && stateStartedAt && now - stateStartedAt >= stateDuration) {
      petState = 'idle'; stateDuration = null
    }
    if (Math.round(hunger) >= 75 && petState !== 'eating' && petState !== 'sleeping') petState = 'hungry'
    return {
      ...saved, petState,
      hunger:  Math.min(100, Math.max(0, Math.round(hunger))),
      mood:    Math.min(100, Math.max(0, Math.round(mood))),
      energy:  Math.min(100, Math.max(0, Math.round(energy))),
      stateStartedAt, stateDuration, lastUpdatedAt: now,
    }
  } catch { return getDefaultPetData() }
}

function savePetData(data) {
  try { localStorage.setItem(PET_KEY, JSON.stringify({ ...data, lastUpdatedAt: Date.now() })) } catch {}
}

// ── Persistence: progression ──────────────────────────────────────────────────
function getDefaultProgress() { return { feedCount: 0, playCount: 0 } }

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROG_KEY)
    return raw ? { ...getDefaultProgress(), ...JSON.parse(raw) } : getDefaultProgress()
  } catch { return getDefaultProgress() }
}

function saveProgress(p) {
  try { localStorage.setItem(PROG_KEY, JSON.stringify(p)) } catch {}
}

// ── Derived unlocks ───────────────────────────────────────────────────────────
function getUnlocks(prog, streak) {
  const r = {}
  for (const m of UNLOCK_MILESTONES) r[m.id] = m.check(prog, streak || 0)
  return r
}

// ── State-consistent idle messages ───────────────────────────────────────────
function getIdleMessages(hunger, mood, energy) {
  if (hunger > 70) return ["I'm hungry... 😿", "Please feed me! 🍜", "My tummy is growling... 😢"]
  if (hunger > 50) return ["Getting a bit hungry...", "I could eat soon~ 🍜"]
  if (energy < 20) return ["So sleepy... 😴", "I need a nap..."]
  if (mood < 30)   return ["I'm bored... 😐", "Can we play? 🧶", "Pay attention to me! 😾"]
  return ["Purr~ 💕", "I love you! 😊", "*stretches lazily* 😺", "Meow~ 🐱", "Head bumps! 💕", "*kneads happily*"]
}

// ── Cat sprite component ──────────────────────────────────────────────────────
function CatSprite({ state, flipX }) {
  const [imgOk, setImgOk] = useState(true)
  const pose = POSE[state] || POSE.idle
  const posX = -(pose.col * DISP_W)
  const posY = -(pose.row * DISP_H)

  return (
    <div
      className={`cat-sprite-frame cat-anim-${state}`}
      style={{
        width: DISP_W, height: DISP_H, flexShrink: 0,
        transform: flipX ? 'scaleX(-1)' : 'none',
        transformOrigin: 'bottom center',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {imgOk ? (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:    `url(${CAT_SPRITE})`,
          backgroundRepeat:   'no-repeat',
          backgroundSize:     `${BG_W}px auto`,
          backgroundPosition: `${posX}px ${posY}px`,
          imageRendering:     'auto',
          mixBlendMode:       'multiply',
        }}/>
      ) : (
        <FallbackCat state={state}/>
      )}
      <img src={CAT_SPRITE} alt="" style={{ display: 'none' }} onError={() => setImgOk(false)}/>
    </div>
  )
}

// ── Fallback SVG cat ──────────────────────────────────────────────────────────
function FallbackCat({ state }) {
  const sleeping   = state === 'sleeping'
  const eating     = state === 'eating'
  const playing    = state === 'playing'
  return (
    <svg viewBox="0 0 110 126" width={DISP_W} height={DISP_H} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bodyG" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#D4B896"/>
          <stop offset="100%" stopColor="#A8896A"/>
        </radialGradient>
        <radialGradient id="bellyG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0DFC0"/>
          <stop offset="100%" stopColor="#DFC4A0"/>
        </radialGradient>
      </defs>
      <ellipse cx="55" cy={sleeping ? 95 : 82} rx="32" ry={sleeping ? 18 : 28} fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
      <ellipse cx="55" cy={sleeping ? 93 : 86} rx="18" ry={sleeping ? 10 : 16} fill="url(#bellyG)"/>
      {!sleeping && (
        <>
          <circle cx="55" cy="44" r="24" fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
          <polygon points="35,26 28,10 44,22" fill="#C4986A" stroke="#8B6A4A" strokeWidth="1"/>
          <polygon points="37,27 32,14 43,22" fill="#F0A0A0"/>
          <polygon points="75,26 82,10 66,22" fill="#C4986A" stroke="#8B6A4A" strokeWidth="1"/>
          <polygon points="73,27 78,14 67,22" fill="#F0A0A0"/>
          {eating || playing ? (
            <>
              <path d="M44,42 Q47,39 50,42" stroke="#4A3020" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
              <path d="M60,42 Q63,39 66,42" stroke="#4A3020" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            </>
          ) : (
            <>
              <circle cx="47" cy="43" r="5.5" fill="#3A2810"/>
              <circle cx="63" cy="43" r="5.5" fill="#3A2810"/>
              <circle cx="49" cy="41" r="1.8" fill="white"/>
              <circle cx="65" cy="41" r="1.8" fill="white"/>
            </>
          )}
          <ellipse cx="55" cy="51" rx="3" ry="2" fill="#E08080"/>
          <line x1="30" y1="50" x2="48" y2="52" stroke="#8B6A4A" strokeWidth="0.8"/>
          <line x1="30" y1="53" x2="48" y2="54" stroke="#8B6A4A" strokeWidth="0.8"/>
          <line x1="80" y1="50" x2="62" y2="52" stroke="#8B6A4A" strokeWidth="0.8"/>
          <line x1="80" y1="53" x2="62" y2="54" stroke="#8B6A4A" strokeWidth="0.8"/>
          <rect x="40" y="63" width="30" height="7" rx="3.5" fill="#D44A4A" stroke="#A03030" strokeWidth="0.8"/>
          <circle cx="55" cy="66.5" r="3.5" fill="#F0C030" stroke="#B08000" strokeWidth="0.8"/>
        </>
      )}
      {sleeping && (
        <>
          <ellipse cx="55" cy="80" r="22" fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
          <ellipse cx="55" cy="78" rx="12" ry="10" fill="url(#bellyG)"/>
          <circle cx="70" cy="80" r="16" fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
          <path d="M62,78 Q65,75 68,78" stroke="#4A3020" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M71,78 Q74,75 77,78" stroke="#4A3020" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <ellipse cx="70" cy="84" rx="2.5" ry="1.5" fill="#E08080"/>
          <polygon points="60,68 56,58 64,66" fill="#C4986A" stroke="#8B6A4A" strokeWidth="0.8"/>
          <polygon points="80,65 84,55 76,63" fill="#C4986A" stroke="#8B6A4A" strokeWidth="0.8"/>
        </>
      )}
      <path d={sleeping
        ? "M35,92 Q15,85 20,100 Q25,110 40,105"
        : "M26,92 Q8,78 12,60 Q16,48 24,55"}
        stroke="#A8896A" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d={sleeping
        ? "M35,92 Q15,85 20,100 Q25,110 40,105"
        : "M26,92 Q8,78 12,60 Q16,48 24,55"}
        stroke="#C4A880" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {!sleeping && (
        <>
          <ellipse cx="42" cy="106" rx="9" ry="6"   fill="#B89870" stroke="#8B6A4A" strokeWidth="1"/>
          <ellipse cx="68" cy="106" rx="9" ry="6"   fill="#B89870" stroke="#8B6A4A" strokeWidth="1"/>
          <ellipse cx="42" cy="104" rx="7" ry="4.5" fill="#C4A880"/>
          <ellipse cx="68" cy="104" rx="7" ry="4.5" fill="#C4A880"/>
        </>
      )}
      {!sleeping ? (
        <>
          <path d="M42,34 Q44,28 46,34" stroke="#8B6A4A" strokeWidth="1" fill="none"/>
          <path d="M55,30 Q57,24 59,30" stroke="#8B6A4A" strokeWidth="1" fill="none"/>
          <path d="M68,34 Q70,28 72,34" stroke="#8B6A4A" strokeWidth="1" fill="none"/>
        </>
      ) : (
        <path d="M50,72 Q55,68 60,72" stroke="#8B6A4A" strokeWidth="1" fill="none"/>
      )}
    </svg>
  )
}

// ── Pet state labels ──────────────────────────────────────────────────────────
const PET_LABEL = {
  idle:       { label: 'Relaxing 😌',      color: '#5A8A5A', bg: '#E8F5E9' },
  sleeping:   { label: 'Sleeping 😴',      color: '#4A5AAA', bg: '#EEF0FA' },
  hungry:     { label: 'Hungry!! 😿',      color: '#B02020', bg: '#FEECEB' },
  eating:     { label: 'Eating 😋',        color: '#B84A00', bg: '#FFF3E0' },
  playing:    { label: 'Playing 😸',       color: '#2A7A3A', bg: '#E8F5E9' },
  scratching: { label: 'Scratching 😼',    color: '#6A1B9A', bg: '#F5EEF8' },
  walking:    { label: 'On the way... 🐾', color: '#4A7A9A', bg: '#E8F4FA' },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyRoom({ avatar, xp, streak, mealCount, level, onClose, onSpendXP }) {
  const seed = avatar || 'Felix'

  // ── Pet state ────────────────────────────────────────────────────────────
  const [inited,    setInited]    = useState(false)
  const [petState,  setPetState]  = useState('idle')
  const [catPos,    setCatPos]    = useState({ x: 45, y: 10 })
  const [hunger,    setHunger]    = useState(20)
  const [mood,      setMood]      = useState(70)
  const [energy,    setEnergy]    = useState(80)
  const [isWalking, setIsWalking] = useState(false)
  const [flipX,     setFlipX]     = useState(false)
  const [message,   setMessage]   = useState(null)
  const [showMsg,   setShowMsg]   = useState(false)
  const [xpFlash,   setXpFlash]   = useState(null)
  const [wakeDialog,setWakeDialog]= useState(false)
  const [localXP,   setLocalXP]   = useState(xp || 0)

  // ── Progression state ────────────────────────────────────────────────────
  const [progress,    setProgress]    = useState(getDefaultProgress)
  const [unlockPopup, setUnlockPopup] = useState(null)   // { emoji, name }
  const [hearts,      setHearts]      = useState([])     // [{id, offsetX}]

  useEffect(() => setLocalXP(xp || 0), [xp])

  // Derived unlocks (memoised)
  const unlocks = useMemo(() => getUnlocks(progress, streak), [progress, streak])

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadPetData()
    setPetState(saved.petState)
    setCatPos(saved.pos || { x: 45, y: 10 })
    setHunger(saved.hunger)
    setMood(saved.mood)
    setEnergy(saved.energy)
    setFlipX(saved.flipX || false)
    setProgress(loadProgress())
    setInited(true)
  }, [])

  // ── Refs ─────────────────────────────────────────────────────────────────
  const stateRef         = useRef('idle')
  const hungerRef        = useRef(20)
  const energyRef        = useRef(80)
  const isWalkRef        = useRef(false)
  const catPosRef        = useRef({ x: 45, y: 10 })
  const stateStartedRef  = useRef(Date.now())
  const stateDurationRef = useRef(null)
  const unlocksRef       = useRef(unlocks)

  const msgTimer    = useRef(null)
  const stateTimer  = useRef(null)
  const walkTimer   = useRef(null)
  const scratchTimer= useRef(null)

  useEffect(() => { stateRef.current   = petState  }, [petState])
  useEffect(() => { hungerRef.current  = hunger    }, [hunger])
  useEffect(() => { energyRef.current  = energy    }, [energy])
  useEffect(() => { isWalkRef.current  = isWalking }, [isWalking])
  useEffect(() => { catPosRef.current  = catPos    }, [catPos])
  useEffect(() => { unlocksRef.current = unlocks   }, [unlocks])

  // ── Auto-persist pet state ───────────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    savePetData({ petState, pos: catPos, hunger, mood, energy, flipX,
      stateStartedAt: stateStartedRef.current, stateDuration: stateDurationRef.current })
  }, [petState, hunger, mood, energy, catPos, flipX, inited])

  // ── Helpers ──────────────────────────────────────────────────────────────
  const bubble = useCallback((msg, ms = 2800) => {
    clearTimeout(msgTimer.current)
    setMessage(msg); setShowMsg(true)
    msgTimer.current = setTimeout(() => setShowMsg(false), ms)
  }, [])

  const scheduleIdle = useCallback((stateKey) => {
    clearTimeout(stateTimer.current)
    const ms = STATE_DURATION[stateKey] || 4000
    stateStartedRef.current  = Date.now()
    stateDurationRef.current = ms
    stateTimer.current = setTimeout(() => {
      setPetState('idle')
      stateDurationRef.current = null
    }, ms)
  }, [])

  const walkTo = useCallback((dest, onArrived) => {
    clearTimeout(walkTimer.current)
    const cur  = catPosRef.current
    const dx   = dest.x - cur.x
    const dy   = dest.y - cur.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    catPosRef.current = dest
    setCatPos(dest)
    if (dist < 4) { if (onArrived) onArrived(); return }
    setFlipX(dx < 0)
    setIsWalking(true)
    walkTimer.current = setTimeout(() => {
      setIsWalking(false)
      setFlipX(false)
      if (onArrived) onArrived()
    }, Math.max(500, dist * 38))
  }, [])

  const spendXP = useCallback((amount) => {
    if (amount <= 0) return true
    if (localXP < amount) return false
    setLocalXP(p => p - amount)
    if (onSpendXP) onSpendXP(amount)
    setXpFlash(`-${amount} XP`)
    setTimeout(() => setXpFlash(null), 1800)
    return true
  }, [localXP, onSpendXP])

  // ── Heart animation ──────────────────────────────────────────────────────
  const showHearts = useCallback(() => {
    const id = Date.now()
    const batch = [
      { id: id,     offsetX: -18 },
      { id: id + 1, offsetX: 0   },
      { id: id + 2, offsetX: 18  },
    ]
    setHearts(prev => [...prev, ...batch])
    setTimeout(() => setHearts(prev => prev.filter(h => !batch.some(b => b.id === h.id))), 1400)
  }, [])

  // ── Auto-scratch (only when scratchPost unlocked) ────────────────────────
  const scheduleAutoScratch = useCallback(() => {
    clearTimeout(scratchTimer.current)
    const delay = 30000 + Math.random() * 40000
    scratchTimer.current = setTimeout(() => {
      if (stateRef.current === 'idle' && !isWalkRef.current && unlocksRef.current.scratchPost) {
        walkTo(OBJ_POS.scratch, () => {
          setPetState('scratching')
          setMood(p => Math.min(p + 6, 100))
          bubble("😼 Ahh~ that's the spot!", 2800)
          scheduleIdle('scratching')
        })
      }
    }, delay)
  }, [walkTo, bubble, scheduleIdle])

  useEffect(() => {
    if (!inited) return
    if (petState === 'idle') scheduleAutoScratch()
    else clearTimeout(scratchTimer.current)
  }, [petState, inited, scheduleAutoScratch])

  // ── Game tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    const tick = setInterval(() => {
      const s = stateRef.current
      if (s !== 'eating')    setHunger(p => Math.min(p + 2, 100))
      if (s === 'sleeping')  setEnergy(p => Math.min(p + 3, 100))
      else if (s !== 'idle') setEnergy(p => Math.max(p - 1, 0))

      // Auto-sleep (only with bed)
      if (energyRef.current <= 10 && s === 'idle' && unlocksRef.current.bed) {
        walkTo(OBJ_POS.bed, () => {
          setPetState('sleeping')
          stateDurationRef.current = null
          bubble('😴 So sleepy... taking a nap.', 3000)
        })
      }
      // Auto-hungry
      if (hungerRef.current >= 75 && s === 'idle') {
        setPetState('hungry')
        bubble("😿 I'm really hungry... please feed me!", 4000)
      }
      // Recover from hungry
      if (hungerRef.current < 35 && s === 'hungry') setPetState('idle')
    }, 5000)
    return () => {
      clearInterval(tick)
      clearTimeout(msgTimer.current)
      clearTimeout(stateTimer.current)
      clearTimeout(walkTimer.current)
      clearTimeout(scratchTimer.current)
    }
  }, [inited, walkTo, bubble])

  // ── Feed ─────────────────────────────────────────────────────────────────
  const handleFeed = () => {
    if (isWalking) return
    if (petState === 'sleeping') {
      clearTimeout(stateTimer.current)
      setPetState('idle')
      bubble('😴 Mmm... food?', 1400)
      setTimeout(() => doFeed(), 1500)
      return
    }
    doFeed()
  }

  const doFeed = () => {
    if (!spendXP(FEED_COST)) {
      bubble(`💸 Need ${FEED_COST} XP. Complete quests first!`, 3200)
      return
    }
    clearTimeout(stateTimer.current)
    clearTimeout(scratchTimer.current)
    walkTo(OBJ_POS.bowl, () => {
      setPetState('eating')
      setHunger(p  => Math.max(0, p - 45))
      setMood(p    => Math.min(p + 10, 100))
      bubble('😋 Yum! Thank you! 💕', 3500)
      showHearts()

      setProgress(prev => {
        const next = { ...prev, feedCount: prev.feedCount + 1 }
        saveProgress(next)
        // Check for new unlocks inside setState callback to avoid stale refs
        const prevU = getUnlocks(prev, streak || 0)
        const nextU = getUnlocks(next, streak || 0)
        for (const m of UNLOCK_MILESTONES) {
          if (nextU[m.id] && !prevU[m.id]) {
            setTimeout(() => {
              setUnlockPopup(m)
              setTimeout(() => setUnlockPopup(null), 3500)
            }, 0)
            break
          }
        }
        return next
      })

      scheduleIdle('eating')
    })
  }

  // ── Play ─────────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (isWalking) return
    if (petState === 'sleeping') { setWakeDialog(true); return }
    if (energyRef.current < 20) {
      bubble('😴 Too tired to play... let me rest.', 3000); return
    }
    if (petState === 'hungry') {
      bubble("😿 Too hungry to play! Feed me first!", 2800); return
    }
    if (petState === 'playing') {
      bubble('😸 Already playing!', 1800); return
    }
    doPlay()
  }

  const doPlay = () => {
    if (!spendXP(PLAY_COST)) {
      bubble(`💸 Need ${PLAY_COST} XP. Complete quests first!`, 3200)
      return
    }
    clearTimeout(stateTimer.current)
    clearTimeout(scratchTimer.current)
    const dest = unlocksRef.current.toy ? OBJ_POS.toy : OBJ_POS.center
    walkTo(dest, () => {
      setPetState('playing')
      setMood(p   => Math.min(p + 20, 100))
      setEnergy(p => Math.max(p - 18, 0))
      bubble('😸 Wheee!! So fun! ✨', 3000)

      setProgress(prev => {
        const next = { ...prev, playCount: prev.playCount + 1 }
        saveProgress(next)
        const prevU = getUnlocks(prev, streak || 0)
        const nextU = getUnlocks(next, streak || 0)
        for (const m of UNLOCK_MILESTONES) {
          if (nextU[m.id] && !prevU[m.id]) {
            setTimeout(() => {
              setUnlockPopup(m)
              setTimeout(() => setUnlockPopup(null), 3500)
            }, 0)
            break
          }
        }
        return next
      })

      scheduleIdle('playing')
    })
  }

  const confirmWakePlay = () => {
    setWakeDialog(false)
    clearTimeout(stateTimer.current)
    setPetState('idle')
    bubble("😺 Okay okay, I'm up!", 1400)
    setTimeout(() => doPlay(), 1500)
  }

  // ── Cat click ────────────────────────────────────────────────────────────
  const handleCatClick = () => {
    if (isWalking) return
    if (petState === 'sleeping') {
      clearTimeout(stateTimer.current)
      setPetState('idle')
      bubble('😺 Good morning! ☀️', 2000)
      return
    }
    if (petState === 'eating')     { bubble('😋 Eating, give me a sec~', 1500); return }
    if (petState === 'playing')    { bubble('😸 Busy playing!', 1500);          return }
    if (petState === 'scratching') { bubble('😼 Scratching, ahh~', 1500);      return }
    if (petState === 'hungry')     { bubble("😿 Feed me! I'm starving!", 1500); return }

    // State-consistent idle messages
    const msgs = getIdleMessages(hunger, mood, energy)
    bubble(msgs[Math.floor(Math.random() * msgs.length)])
    setMood(p => Math.min(p + 5, 100))
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const displayState = isWalking ? 'walking' : petState
  const label        = PET_LABEL[displayState] || PET_LABEL.idle

  const hungerColor = hunger >= 70 ? '#E53935' : hunger >= 45 ? '#FB8C00' : '#43A047'
  const moodColor   = mood   >= 60 ? '#43A047' : mood   >= 30 ? '#FB8C00' : '#E53935'
  const energyColor = energy >= 60 ? '#2196F3' : energy >= 30 ? '#FF9800' : '#9E9E9E'
  const canFeed     = localXP >= FEED_COST
  const canPlay     = localXP >= PLAY_COST && energy >= 20

  // Next milestone to show
  const nextMilestone = UNLOCK_MILESTONES.find(m => !m.check(progress, streak || 0))

  if (!inited) return null

  // ── Render ────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="room-modal-bg" onClick={onClose}>
      <div className="room-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="room-header">
          <span className="room-title">🏠 My Room</span>
          <div className="room-xp-badge">
            <span className="room-xp-icon">⚡</span>
            <span className="room-xp-val">{localXP.toLocaleString()} XP</span>
          </div>
          <button className="room-close" onClick={onClose}>✕</button>
        </div>

        {/* Room scene */}
        <div className="room-scene">
          <div className="room-ceiling"/>
          <div className="room-wall"/>
          <div className="room-baseboard"/>
          <div className="room-floor"/>

          {/* Window */}
          <div className="room-win-wrap">
            <div className="room-curtain room-curtain-l"/>
            <div className="room-window">
              <div className="room-win-sky">
                <div className="room-sun"/>
                <div className="room-cloud room-cloud-1"/>
                <div className="room-cloud room-cloud-2"/>
              </div>
              <div className="room-win-bar-h"/><div className="room-win-bar-v"/>
            </div>
            <div className="room-curtain room-curtain-r"/>
          </div>

          {/* Wall decorations (unlockable) */}
          {unlocks.painting   && <div style={{ position:'absolute', left:'18%',  top:'8%',  fontSize:34, zIndex:4 }}>🖼️</div>}
          {unlocks.bookshelf  && <div style={{ position:'absolute', left:'2%',   top:'8%',  fontSize:36, zIndex:4 }}>📚</div>}

          {/* Floor: Bed (unlock: 3d streak) */}
          {unlocks.bed && (
            <div style={{ position:'absolute', left:'0%', bottom:'28%', fontSize:52, zIndex:4, lineHeight:1 }}>
              🛏️
            </div>
          )}

          {/* Floor: Scratch post (unlock: 3 feeds) */}
          {unlocks.scratchPost && (
            <div className="room-obj-fixed" style={{ left:`${OBJ_POS.scratch.x}%`, bottom:`${OBJ_POS.scratch.y}%` }}>
              <div className="room-obj-icon">🪵</div>
              <div className="room-obj-label">Scratch Post</div>
            </div>
          )}

          {/* Floor: Food bowl (always visible) */}
          <div className="room-obj-fixed" style={{ left:`${OBJ_POS.bowl.x}%`, bottom:`${OBJ_POS.bowl.y}%` }}>
            <div className="room-obj-icon">🥣</div>
            <div className="room-obj-label">Food Bowl</div>
          </div>

          {/* Floor: Toy (unlock: 5 plays) */}
          {unlocks.toy && (
            <div className="room-obj-fixed" style={{ left:`${OBJ_POS.toy.x}%`, bottom:`${OBJ_POS.toy.y}%` }}>
              <div className={`room-obj-icon ${petState === 'playing' ? 'ball-active' : ''}`}>🧶</div>
              <div className="room-obj-label">Yarn Toy</div>
            </div>
          )}

          {/* Floor: unlocked decorations */}
          {unlocks.plant  && <div style={{ position:'absolute', left:'30%', bottom:'27%', fontSize:38, zIndex:4, lineHeight:1 }}>🪴</div>}
          {unlocks.lamp   && <div style={{ position:'absolute', left:'19%', bottom:'30%', fontSize:36, zIndex:4, lineHeight:1 }}>🪔</div>}
          {unlocks.sofa   && <div style={{ position:'absolute', right:'0%', bottom:'30%', fontSize:46, zIndex:4, lineHeight:1 }}>🛋️</div>}
          {unlocks.aquarium && <div style={{ position:'absolute', right:'2%', top:'28%', fontSize:34, zIndex:4, lineHeight:1 }}>🐠</div>}

          {/* Cat */}
          <div
            className="room-pet-wrap"
            style={{ left:`${catPos.x}%`, bottom:`${catPos.y}%` }}
            onClick={handleCatClick}
          >
            {/* State label */}
            <div className="cat-state-label" style={{ background: label.bg, color: label.color }}>
              {label.label}
            </div>

            {/* Speech bubble */}
            {showMsg && (
              <div className="cat-bubble">
                {message}
                <span className="cat-bubble-tail"/>
              </div>
            )}

            {/* Floating hearts */}
            {hearts.map(h => (
              <div key={h.id} className="heart-float" style={{ left: `calc(50% + ${h.offsetX}px)` }}>
                💕
              </div>
            ))}

            <CatSprite state={displayState} flipX={flipX}/>

            {/* Zzz for sleeping */}
            {petState === 'sleeping' && !isWalking && (
              <div className="cat-zzz-wrap">
                <span className="cat-zzz z1">z</span>
                <span className="cat-zzz z2">z</span>
                <span className="cat-zzz z3">Z</span>
              </div>
            )}

            <div className="cat-floor-shadow"/>
          </div>

          {/* XP flash */}
          {xpFlash && <div className="cat-xp-pop xp-spend">{xpFlash}</div>}

          {/* Owner avatar */}
          <div className="room-char">
            <img src={DICEBEAR(seed)} alt="you" className="room-char-img"/>
            <div className="room-char-name">{seed}</div>
            <div className="room-char-shadow"/>
          </div>

          {/* Unlock popup */}
          {unlockPopup && (
            <div className="unlock-popup">
              <div className="unlock-popup-emoji">{unlockPopup.emoji}</div>
              <div className="unlock-popup-text">
                <div className="unlock-popup-title">New item unlocked!</div>
                <div className="unlock-popup-name">{unlockPopup.name}</div>
              </div>
            </div>
          )}
        </div>

        {/* Wake dialog */}
        {wakeDialog && (
          <div className="wake-dialog">
            <p className="wake-text">😴 The cat is sleeping...<br/>Wake up and play?</p>
            <div className="wake-btns">
              <button className="wake-btn wake-yes" onClick={confirmWakePlay}>Yes, wake up!</button>
              <button className="wake-btn wake-no"  onClick={() => setWakeDialog(false)}>Let it sleep</button>
            </div>
          </div>
        )}

        {/* Scrollable bottom section */}
        <div className="room-scroll-body">

          {/* Action buttons: Feed + Play only */}
          <div className="cat-actions">
            <button
              className={`cat-act-btn cat-act-feed ${hunger > 60 ? 'urgent' : ''} ${!canFeed ? 'act-locked' : ''}`}
              onClick={handleFeed}
            >
              {hunger > 70 && <span className="cat-act-dot"/>}
              <span className="cat-act-icon">🥣</span>
              <span className="cat-act-label">Feed</span>
              <span className={`cat-act-cost ${!canFeed ? 'cost-low' : ''}`}>{FEED_COST} XP</span>
            </button>

            <button
              className={`cat-act-btn cat-act-play ${!canPlay ? 'act-locked' : ''}`}
              onClick={handlePlay}
            >
              <span className="cat-act-icon">🧶</span>
              <span className="cat-act-label">Play</span>
              <span className={`cat-act-cost ${localXP < PLAY_COST ? 'cost-low' : ''}`}>{PLAY_COST} XP</span>
            </button>
          </div>

          {/* Hint */}
          <div className="room-hint">
            💡 Complete quests → earn XP → care for your cat · Scratch is automatic ✨
          </div>

          {/* Stats */}
          <div className="pet-stats-bar">
            {[
              { icon: '🍜', label: 'Hunger',  hint: '↓ lower = full',   val: hunger, color: hungerColor },
              { icon: '💕', label: 'Mood',    hint: '↑ higher = happy', val: mood,   color: moodColor   },
              { icon: '⚡', label: 'Energy',  hint: '↑ higher = active',val: energy, color: energyColor },
            ].map(({ icon, label: lbl, hint, val, color }) => (
              <div key={lbl} className="pet-bar-row">
                <div className="pet-bar-lbl">
                  <span>{icon} {lbl}</span>
                  <span className="pet-bar-hint">{hint}</span>
                </div>
                <div className="pet-bar-track">
                  <div className="pet-bar-fill" style={{ width:`${val}%`, background: color }}/>
                </div>
                <span className="pet-bar-num" style={{ color }}>
                  {val}<span className="pet-bar-denom">/100</span>
                </span>
              </div>
            ))}
          </div>

          {/* Progression */}
          <div className="room-progress-section">
            <div className="room-prog-header">
              <span>🌟 Room Progress</span>
              <span className="room-prog-counts">
                🍜 {progress.feedCount} feeds · 🧶 {progress.playCount} plays
              </span>
            </div>

            {nextMilestone && (
              <div className="room-next-unlock">
                <span className="room-next-emoji">{nextMilestone.emoji}</span>
                <span className="room-next-info">
                  <span className="room-next-name">{nextMilestone.name}</span>
                  <span className="room-next-req">{nextMilestone.req}</span>
                </span>
              </div>
            )}
          </div>

        </div>{/* end room-scroll-body */}
      </div>
    </div>,
    document.body
  )
}
