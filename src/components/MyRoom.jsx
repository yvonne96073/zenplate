import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

const DICEBEAR = (seed) =>
  `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=2BB5A0&textColor=ffffff&fontSize=40`

// ── Room furniture (decorative, unlockable) ───────────────────────────────────
export const ROOM_ITEMS = [
  { id: 'plant',     emoji: '🪴',  name: 'Potted Plant',  slot: 'fl3',   size: 42, unlockDesc: '50 XP',     check: (xp)=>xp>=50 },
  { id: 'lamp',      emoji: '🪔',  name: 'Floor Lamp',    slot: 'fl2',   size: 40, unlockDesc: '100 XP',    check: (xp)=>xp>=100 },
  { id: 'painting',  emoji: '🖼️', name: 'Wall Painting', slot: 'wl2',   size: 38, unlockDesc: '150 XP',    check: (xp)=>xp>=150 },
  { id: 'mirror',    emoji: '🪞',  name: 'Mirror',        slot: 'wr2',   size: 38, unlockDesc: '200 XP',    check: (xp)=>xp>=200 },
  { id: 'sofa',      emoji: '🛋️', name: 'Cozy Sofa',     slot: 'fr3',   size: 52, unlockDesc: '200 XP',    check: (xp)=>xp>=200 },
  { id: 'desk',      emoji: '🖥️', name: 'Gaming Desk',   slot: 'fr2',   size: 46, unlockDesc: '300 XP',    check: (xp)=>xp>=300 },
  { id: 'fish',      emoji: '🐠',  name: 'Aquarium',      slot: 'wr3',   size: 38, unlockDesc: '400 XP',    check: (xp)=>xp>=400 },
  { id: 'galaxy',    emoji: '🌌',  name: 'Galaxy Poster', slot: 'wr1',   size: 38, unlockDesc: '500 XP',    check: (xp)=>xp>=500 },
  { id: 'bookshelf', emoji: '📚',  name: 'Bookshelf',     slot: 'wl1',   size: 42, unlockDesc: '5d streak', check: (_,s)=>s>=5 },
  { id: 'moonlamp',  emoji: '🌙',  name: 'Moon Lamp',     slot: 'fl4',   size: 34, unlockDesc: '14d streak',check: (_,s)=>s>=14 },
  { id: 'trophy',    emoji: '🏆',  name: 'Trophy Shelf',  slot: 'wl3',   size: 38, unlockDesc: '30 meals',  check: (_,__,m)=>m>=30 },
  { id: 'throne',    emoji: '👑',  name: 'Royal Throne',  slot: 'fc',    size: 48, unlockDesc: 'Lv.10',    check: (_,__,___,l)=>l>=10 },
]

const SLOTS = {
  wl1:  { left: '1%',   top: '8%'  }, wl2:  { left: '18%',  top: '6%'  },
  wl3:  { left: '1%',   top: '30%' },
  wr1:  { right: '1%',  top: '6%'  }, wr2:  { right: '18%', top: '6%'  },
  wr3:  { right: '1%',  top: '28%' },
  fl2:  { left: '19%',  bottom: '30%' },
  fl3:  { left: '30%',  bottom: '27%' }, fl4:  { left: '17%',  bottom: '48%' },
  fr2:  { right: '17%', bottom: '30%' }, fr3:  { right: '0%',  bottom: '30%' },
  fc:   { left: '42%',  bottom: '30%' },
}

// ── Persistence ───────────────────────────────────────────────────────────────
const PET_KEY = 'zp_pet_v2'

function getDefaultPetData() {
  return {
    petState:      'idle',
    pos:           { x: 45, y: 10 },
    hunger:        20,
    mood:          70,
    energy:        80,
    flipX:         false,
    stateStartedAt: Date.now(),
    stateDuration:  null,
    lastUpdatedAt:  Date.now(),
  }
}

function loadPetData() {
  try {
    const raw = localStorage.getItem(PET_KEY)
    if (!raw) return getDefaultPetData()

    const saved = JSON.parse(raw)
    const now = Date.now()
    const elapsedMs = now - (saved.lastUpdatedAt || now)
    const ticks = Math.min(Math.floor(elapsedMs / 5000), 720) // cap at 1hr

    let { petState, hunger, mood, energy, stateStartedAt, stateDuration } = saved

    // Apply elapsed time to stats
    for (let i = 0; i < ticks; i++) {
      if (petState !== 'eating')   hunger  = Math.min(hunger + 2, 100)
      if (petState === 'sleeping') energy  = Math.min(energy + 3, 100)
      else                         energy  = Math.max(energy - 0.2, 0)
    }

    // Check if timed state expired
    if (stateDuration && stateStartedAt) {
      if (now - stateStartedAt >= stateDuration) {
        petState = 'idle'
        stateDuration = null
      }
    }

    // Auto-hungry
    if (Math.round(hunger) >= 75 && petState !== 'eating' && petState !== 'sleeping') {
      petState = 'hungry'
    }

    return {
      ...saved,
      petState,
      hunger:        Math.min(100, Math.max(0, Math.round(hunger))),
      mood:          Math.min(100, Math.max(0, Math.round(mood))),
      energy:        Math.min(100, Math.max(0, Math.round(energy))),
      stateStartedAt,
      stateDuration,
      lastUpdatedAt: now,
    }
  } catch {
    return getDefaultPetData()
  }
}

function savePetData(data) {
  try {
    localStorage.setItem(PET_KEY, JSON.stringify({ ...data, lastUpdatedAt: Date.now() }))
  } catch {}
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FEED_COST = 30
const PLAY_COST = 20

const STATE_DURATION = {
  eating:     5000,
  playing:    8000,
  scratching: 6000,
}

// ── Floor object positions (left%, bottom%) ───────────────────────────────────
const OBJ_POS = {
  bowl:    { x: 33, y: 10 },
  toy:     { x: 58, y: 10 },
  scratch: { x: 16, y: 14 },
  center:  { x: 45, y: 10 },
  bed:     { x: 8,  y: 30 },
}

// ── Sprite sheet config ───────────────────────────────────────────────────────
// Image: 677 × 683px — 3 cols × 2 rows of poses, room scene at bottom (ignored)
//   col 0      col 1      col 2
//   [idle]  [walking]  [sleeping]    ← row 0
//   [eating] [playing] [scratching]  ← row 1
//   [──────── room scene (ignored) ──────────]
const CAT_SPRITE  = '/cat.png'
const ORIG_IMG_W  = 677    // actual image width px
const ORIG_CELL_W = 225.7  // 677 / 3 cols
const ORIG_CELL_H = 231.5  // (683 - 220 room scene) / 2 rows
const DISP_W = 110
const S      = DISP_W / ORIG_CELL_W        // 0.4874
const DISP_H = Math.round(ORIG_CELL_H * S) // 113px
const BG_W   = Math.round(ORIG_IMG_W * S)  // 330px

const POSE = {
  idle:       { col: 0, row: 0 },
  walking:    { col: 1, row: 0 },
  sleeping:   { col: 2, row: 0 },
  eating:     { col: 0, row: 1 },
  playing:    { col: 1, row: 1 },
  scratching: { col: 2, row: 1 },
  hungry:     { col: 0, row: 0 },
}

// ── Cat sprite component ───────────────────────────────────────────────────────
function CatSprite({ state, flipX }) {
  const [imgOk, setImgOk] = useState(true)
  const pose = POSE[state] || POSE.idle
  const posX = -(pose.col * DISP_W)
  const posY = -(pose.row * DISP_H)

  return (
    <div
      className={`cat-sprite-frame cat-anim-${state}`}
      style={{
        width:    DISP_W,
        height:   DISP_H,
        flexShrink: 0,
        transform: flipX ? 'scaleX(-1)' : 'none',
        transformOrigin: 'bottom center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {imgOk ? (
        /* Sprite sheet — background-image approach */
        <div style={{
          position:           'absolute',
          inset:              0,
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
      {/* Hidden probe to detect 404 */}
      <img
        src={CAT_SPRITE}
        alt=""
        style={{ display: 'none' }}
        onError={() => setImgOk(false)}
      />
    </div>
  )
}

// ── Fallback SVG cat (used only if /cat.png is missing) ───────────────────────
function FallbackCat({ state }) {
  const sleeping   = state === 'sleeping'
  const eating     = state === 'eating'
  const playing    = state === 'playing'
  const scratching = state === 'scratching'

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
      {/* Body */}
      <ellipse cx="55" cy={sleeping ? 95 : 82} rx="32" ry={sleeping ? 18 : 28} fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
      {/* Belly */}
      <ellipse cx="55" cy={sleeping ? 93 : 86} rx="18" ry={sleeping ? 10 : 16} fill="url(#bellyG)"/>
      {/* Head */}
      {!sleeping && (
        <>
          <circle cx="55" cy="44" r="24" fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
          {/* Ears */}
          <polygon points="35,26 28,10 44,22" fill="#C4986A" stroke="#8B6A4A" strokeWidth="1"/>
          <polygon points="37,27 32,14 43,22" fill="#F0A0A0"/>
          <polygon points="75,26 82,10 66,22" fill="#C4986A" stroke="#8B6A4A" strokeWidth="1"/>
          <polygon points="73,27 78,14 67,22" fill="#F0A0A0"/>
          {/* Eyes */}
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
          {/* Nose */}
          <ellipse cx="55" cy="51" rx="3" ry="2" fill="#E08080"/>
          {/* Whiskers */}
          <line x1="30" y1="50" x2="48" y2="52" stroke="#8B6A4A" strokeWidth="0.8"/>
          <line x1="30" y1="53" x2="48" y2="54" stroke="#8B6A4A" strokeWidth="0.8"/>
          <line x1="80" y1="50" x2="62" y2="52" stroke="#8B6A4A" strokeWidth="0.8"/>
          <line x1="80" y1="53" x2="62" y2="54" stroke="#8B6A4A" strokeWidth="0.8"/>
          {/* Bell collar */}
          <rect x="40" y="63" width="30" height="7" rx="3.5" fill="#D44A4A" stroke="#A03030" strokeWidth="0.8"/>
          <circle cx="55" cy="66.5" r="3.5" fill="#F0C030" stroke="#B08000" strokeWidth="0.8"/>
        </>
      )}
      {/* Sleeping pose — curled up */}
      {sleeping && (
        <>
          <ellipse cx="55" cy="80" r="22" fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
          <ellipse cx="55" cy="78" rx="12" ry="10" fill="url(#bellyG)"/>
          {/* Sleeping head */}
          <circle cx="70" cy="80" r="16" fill="url(#bodyG)" stroke="#8B6A4A" strokeWidth="1.2"/>
          <path d="M62,78 Q65,75 68,78" stroke="#4A3020" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <path d="M71,78 Q74,75 77,78" stroke="#4A3020" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <ellipse cx="70" cy="84" rx="2.5" ry="1.5" fill="#E08080"/>
          {/* Ears on sleeping head */}
          <polygon points="60,68 56,58 64,66" fill="#C4986A" stroke="#8B6A4A" strokeWidth="0.8"/>
          <polygon points="80,65 84,55 76,63" fill="#C4986A" stroke="#8B6A4A" strokeWidth="0.8"/>
        </>
      )}
      {/* Tail */}
      <path d={sleeping
        ? "M35,92 Q15,85 20,100 Q25,110 40,105"
        : "M26,92 Q8,78 12,60 Q16,48 24,55"}
        stroke="#A8896A" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d={sleeping
        ? "M35,92 Q15,85 20,100 Q25,110 40,105"
        : "M26,92 Q8,78 12,60 Q16,48 24,55"}
        stroke="#C4A880" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Legs (not sleeping) */}
      {!sleeping && (
        <>
          <ellipse cx="42" cy="106" rx="9" ry="6"  fill="#B89870" stroke="#8B6A4A" strokeWidth="1"/>
          <ellipse cx="68" cy="106" rx="9" ry="6"  fill="#B89870" stroke="#8B6A4A" strokeWidth="1"/>
          <ellipse cx="42" cy="104" rx="7" ry="4.5" fill="#C4A880"/>
          <ellipse cx="68" cy="104" rx="7" ry="4.5" fill="#C4A880"/>
        </>
      )}
      {/* Stripes */}
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

// ── Room furniture item ───────────────────────────────────────────────────────
function RoomItem({ item }) {
  const pos = SLOTS[item.slot] || {}
  return (
    <div style={{
      position: 'absolute', ...pos, zIndex: pos.zIndex || 4,
      fontSize: item.size, lineHeight: 1, textAlign: 'center',
    }}>
      {item.emoji}
    </div>
  )
}

// ── Pet state labels ──────────────────────────────────────────────────────────
const PET_LABEL = {
  idle:       { label: 'Relaxing 😌',       color: '#5A8A5A', bg: '#E8F5E9' },
  sleeping:   { label: 'Sleeping 😴',       color: '#4A5AAA', bg: '#EEF0FA' },
  hungry:     { label: 'Hungry!! 😿',       color: '#B02020', bg: '#FEECEB' },
  eating:     { label: 'Eating 😋',         color: '#B84A00', bg: '#FFF3E0' },
  playing:    { label: 'Playing 😸',        color: '#2A7A3A', bg: '#E8F5E9' },
  scratching: { label: 'Scratching 😼',     color: '#6A1B9A', bg: '#F5EEF8' },
  walking:    { label: 'On the way... 🐾',  color: '#4A7A9A', bg: '#E8F4FA' },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyRoom({ avatar, xp, streak, mealCount, level, onClose, onSpendXP }) {
  const seed = avatar || 'Felix'

  // ── Load persisted state ─────────────────────────────────────────────────
  const [inited, setInited] = useState(false)
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

  useEffect(() => setLocalXP(xp || 0), [xp])

  // Load persisted pet state on mount
  useEffect(() => {
    const saved = loadPetData()
    setPetState(saved.petState)
    setCatPos(saved.pos || { x: 45, y: 10 })
    setHunger(saved.hunger)
    setMood(saved.mood)
    setEnergy(saved.energy)
    setFlipX(saved.flipX || false)
    setInited(true)
  }, [])

  // ── Refs ────────────────────────────────────────────────────────────────
  const stateRef         = useRef('idle')
  const hungerRef        = useRef(20)
  const energyRef        = useRef(80)
  const isWalkRef        = useRef(false)
  const catPosRef        = useRef({ x: 45, y: 10 })
  const stateStartedRef  = useRef(Date.now())
  const stateDurationRef = useRef(null)

  const msgTimer         = useRef(null)
  const stateTimer       = useRef(null)
  const walkTimer        = useRef(null)
  const scratchTimer     = useRef(null)  // auto-scratch scheduler

  useEffect(() => { stateRef.current    = petState    }, [petState])
  useEffect(() => { hungerRef.current   = hunger      }, [hunger])
  useEffect(() => { energyRef.current   = energy      }, [energy])
  useEffect(() => { isWalkRef.current   = isWalking   }, [isWalking])
  useEffect(() => { catPosRef.current   = catPos      }, [catPos])

  // ── Persist on key state changes ────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    savePetData({
      petState, pos: catPos, hunger, mood, energy, flipX,
      stateStartedAt: stateStartedRef.current,
      stateDuration:  stateDurationRef.current,
    })
  }, [petState, hunger, mood, energy, catPos, flipX, inited])

  // ── Bubble helper ────────────────────────────────────────────────────────
  const bubble = useCallback((msg, ms = 2800) => {
    clearTimeout(msgTimer.current)
    setMessage(msg); setShowMsg(true)
    msgTimer.current = setTimeout(() => setShowMsg(false), ms)
  }, [])

  // ── Schedule return to idle after timed state ────────────────────────────
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

  // ── Walk then act ────────────────────────────────────────────────────────
  const walkTo = useCallback((dest, onArrived) => {
    clearTimeout(walkTimer.current)
    const cur = catPosRef.current
    const dx  = dest.x - cur.x
    const dy  = dest.y - cur.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    catPosRef.current = dest
    setCatPos(dest)

    if (dist < 4) { if (onArrived) onArrived(); return }

    setFlipX(dx < 0)
    setIsWalking(true)

    const ms = Math.max(500, dist * 38)
    walkTimer.current = setTimeout(() => {
      setIsWalking(false)
      setFlipX(false)
      if (onArrived) onArrived()
    }, ms)
  }, [])

  // ── Spend XP ─────────────────────────────────────────────────────────────
  const spendXP = useCallback((amount) => {
    if (amount <= 0) return true
    if (localXP < amount) return false
    setLocalXP(p => p - amount)
    if (onSpendXP) onSpendXP(amount)
    setXpFlash(`-${amount} XP`)
    setTimeout(() => setXpFlash(null), 1800)
    return true
  }, [localXP, onSpendXP])

  // ── Auto-scratch scheduler ────────────────────────────────────────────────
  // When cat returns to idle, schedule an auto-scratch in 30–70s
  const scheduleAutoScratch = useCallback(() => {
    clearTimeout(scratchTimer.current)
    const delay = 30000 + Math.random() * 40000  // 30–70s
    scratchTimer.current = setTimeout(() => {
      const s = stateRef.current
      if (s === 'idle' && !isWalkRef.current) {
        walkTo(OBJ_POS.scratch, () => {
          setPetState('scratching')
          setMood(p => Math.min(p + 6, 100))
          bubble('😼 Ahh~ that\'s the spot!', 2800)
          scheduleIdle('scratching')
        })
      }
    }, delay)
  }, [walkTo, bubble, scheduleIdle])

  // Restart auto-scratch timer whenever cat returns to idle
  useEffect(() => {
    if (!inited) return
    if (petState === 'idle') {
      scheduleAutoScratch()
    } else {
      clearTimeout(scratchTimer.current)
    }
  }, [petState, inited, scheduleAutoScratch])

  // ── Game tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    const tick = setInterval(() => {
      const s = stateRef.current

      // Stat decay
      if (s !== 'eating')   setHunger(p => Math.min(p + 2, 100))
      if (s === 'sleeping') setEnergy(p => Math.min(p + 3, 100))
      else if (s !== 'idle') setEnergy(p => Math.max(p - 1, 0))

      // Auto-sleep when energy bottoms out
      if (energyRef.current <= 10 && s === 'idle') {
        walkTo(OBJ_POS.bed, () => {
          setPetState('sleeping')
          stateDurationRef.current = null  // sleep is indefinite
          bubble('😴 So sleepy... taking a nap.', 3000)
        })
      }

      // Auto-hungry
      if (hungerRef.current >= 75 && s === 'idle') {
        setPetState('hungry')
        bubble('😿 I\'m really hungry... please feed me!', 4000)
      }

      // Recover from hungry if fed
      if (hungerRef.current < 35 && s === 'hungry') {
        setPetState('idle')
      }
    }, 5000)

    return () => {
      clearInterval(tick)
      clearTimeout(msgTimer.current)
      clearTimeout(stateTimer.current)
      clearTimeout(walkTimer.current)
      clearTimeout(scratchTimer.current)
    }
  }, [inited, walkTo, bubble])

  // ── Feed action ───────────────────────────────────────────────────────────
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
      bubble(`💸 Need ${FEED_COST} XP. Complete quests to earn XP!`, 3200)
      return
    }
    clearTimeout(stateTimer.current)
    clearTimeout(scratchTimer.current)
    walkTo(OBJ_POS.bowl, () => {
      setPetState('eating')
      setHunger(p => Math.max(0, p - 45))
      setMood(p => Math.min(p + 10, 100))
      bubble('😋 Nom nom nom! So yummy~', 3500)
      scheduleIdle('eating')
    })
  }

  // ── Play action ───────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (isWalking) return

    if (petState === 'sleeping') {
      setWakeDialog(true)
      return
    }
    if (energyRef.current < 20) {
      bubble('😴 Too tired to play right now... let me rest.', 3000)
      return
    }
    if (petState === 'hungry') {
      bubble('😿 Too hungry to play! Feed me first!', 2800)
      return
    }
    if (petState === 'playing') {
      bubble('😸 Already playing!', 1800)
      return
    }

    doPlay()
  }

  const doPlay = () => {
    if (!spendXP(PLAY_COST)) {
      bubble(`💸 Need ${PLAY_COST} XP. Complete quests to earn XP!`, 3200)
      return
    }
    clearTimeout(stateTimer.current)
    clearTimeout(scratchTimer.current)
    walkTo(OBJ_POS.toy, () => {
      setPetState('playing')
      setMood(p => Math.min(p + 20, 100))
      setEnergy(p => Math.max(p - 18, 0))
      bubble('😸 Wheee!! So fun!', 3000)
      scheduleIdle('playing')
    })
  }

  const confirmWakePlay = () => {
    setWakeDialog(false)
    clearTimeout(stateTimer.current)
    setPetState('idle')
    bubble('😺 Okay okay, I\'m up!', 1400)
    setTimeout(() => doPlay(), 1500)
  }

  // ── Click cat ────────────────────────────────────────────────────────────
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
    if (petState === 'hungry')     { bubble('😿 Feed me!', 1500);               return }

    const msgs = ['Purr~ 💕', 'I love you! 😊', 'More pets please 🐾', '*purrs loudly* ✨', 'Meow~ 🐱']
    bubble(msgs[Math.floor(Math.random() * msgs.length)])
    setMood(p => Math.min(p + 5, 100))
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayState = isWalking ? 'walking' : petState
  const label        = PET_LABEL[displayState] || PET_LABEL.idle

  const hungerColor  = hunger >= 70 ? '#E53935' : hunger >= 45 ? '#FB8C00' : '#43A047'
  const moodColor    = mood   >= 60 ? '#43A047' : mood   >= 30 ? '#FB8C00' : '#E53935'
  const energyColor  = energy >= 60 ? '#2196F3' : energy >= 30 ? '#FF9800' : '#9E9E9E'
  const canFeed      = localXP >= FEED_COST
  const canPlay      = localXP >= PLAY_COST && energy >= 20

  const unlockedItems = ROOM_ITEMS.filter(i => !i.check || i.check(xp, streak, mealCount, level))
  const unlockedCount = unlockedItems.length
  const roomPct       = Math.round((unlockedCount / ROOM_ITEMS.length) * 100)
  const nextItems     = ROOM_ITEMS.filter(i => i.check && !i.check(xp, streak, mealCount, level)).slice(0, 3)

  if (!inited) return null

  // ── Render ────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="room-modal-bg" onClick={onClose}>
      <div className="room-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="room-header">
          <span className="room-title">🏠 My Room</span>
          <div className="room-xp-badge">
            <span className="room-xp-icon">⚡</span>
            <span className="room-xp-val">{localXP.toLocaleString()} XP</span>
          </div>
          <button className="room-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Room scene ── */}
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

          {/* Unlocked furniture only */}
          {unlockedItems.map(item => <RoomItem key={item.id} item={item}/>)}

          {/* ── Fixed floor objects ── */}
          {/* Bed */}
          <div style={{ position:'absolute', left:'0%', bottom:'28%', fontSize:54, zIndex:4, lineHeight:1 }}>
            🛏️
          </div>

          {/* Food bowl */}
          <div className="room-obj-fixed" style={{ left:`${OBJ_POS.bowl.x}%`, bottom:`${OBJ_POS.bowl.y}%` }}>
            <div className="room-obj-icon">🥣</div>
            <div className="room-obj-label">Food Bowl</div>
          </div>

          {/* Scratch post */}
          <div className="room-obj-fixed" style={{ left:`${OBJ_POS.scratch.x}%`, bottom:`${OBJ_POS.scratch.y}%` }}>
            <div className="room-obj-icon">🪵</div>
            <div className="room-obj-label">Scratch Post</div>
          </div>

          {/* Toy */}
          <div className="room-obj-fixed" style={{ left:`${OBJ_POS.toy.x}%`, bottom:`${OBJ_POS.toy.y}%` }}>
            <div className={`room-obj-icon ${petState === 'playing' ? 'ball-active' : ''}`}>🧶</div>
            <div className="room-obj-label">Toy</div>
          </div>

          {/* ── Cat ── */}
          <div
            className="room-pet-wrap"
            style={{ left: `${catPos.x}%`, bottom: `${catPos.y}%` }}
            onClick={handleCatClick}
          >
            <div className="cat-state-label" style={{ background: label.bg, color: label.color }}>
              {label.label}
            </div>

            {showMsg && (
              <div className="cat-bubble">
                {message}
                <span className="cat-bubble-tail"/>
              </div>
            )}

            <CatSprite state={displayState} flipX={flipX}/>

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
        </div>

        {/* ── Wake dialog ── */}
        {wakeDialog && (
          <div className="wake-dialog">
            <p className="wake-text">😴 The cat is sleeping...<br/>Wake up and play?</p>
            <div className="wake-btns">
              <button className="wake-btn wake-yes" onClick={confirmWakePlay}>Yes, wake up!</button>
              <button className="wake-btn wake-no"  onClick={() => setWakeDialog(false)}>Let it sleep</button>
            </div>
          </div>
        )}

        {/* ── Action buttons (Feed + Play only) ── */}
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

        {/* ── Game hint ── */}
        <div className="room-hint">
          💡 Complete quests → earn XP → feed &amp; play · Cat scratches automatically ✨
        </div>

        {/* ── Stats ── */}
        <div className="pet-stats-bar">
          {[
            { icon: '🍜', label: 'Hunger',  hint: '↓ lower = full',    val: hunger, color: hungerColor },
            { icon: '💕', label: 'Mood',    hint: '↑ higher = happy',  val: mood,   color: moodColor   },
            { icon: '⚡', label: 'Energy',  hint: '↑ higher = active', val: energy, color: energyColor },
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

        {/* ── Room progress ── */}
        <div className="room-progress">
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'#8A6040', marginBottom:5 }}>
            <span>🏠 Furniture Progress</span>
            <span>{unlockedCount} / {ROOM_ITEMS.length} · {roomPct}%</span>
          </div>
          <div className="room-prog-track">
            <div className="room-prog-fill" style={{ width:`${roomPct}%` }}/>
          </div>
        </div>

        {nextItems.length > 0 && (
          <div className="room-locked-list">
            <p className="room-next-label">✨ Next to unlock:</p>
            <div style={{ display:'flex', gap:8 }}>
              {nextItems.map(i => (
                <div key={i.id} className="room-next-item">
                  <span className="room-next-emoji">{i.emoji}</span>
                  <span className="room-next-name">{i.name}</span>
                  <span className="room-next-req">{i.unlockDesc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
