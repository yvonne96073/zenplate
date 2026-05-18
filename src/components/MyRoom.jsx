import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { calcStars } from '../utils/scoring'
import { getLevelXp, getNextLevelXp } from '../hooks/useProfile'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PET_KEY    = 'zp_pet_v3'
const PROG_KEY   = 'zp_prog_v2'
const CE_KEY     = 'zp_care_energy'
const FEED_COST  = 20
const PLAY_COST  = 15
const CAT_W      = 160
const CAT_H      = 133

function loadCE() { return Math.max(0, parseInt(localStorage.getItem(CE_KEY) || '0')) }
function saveCE(n) { localStorage.setItem(CE_KEY, String(Math.max(0, n))) }

const STATE_DURATION = {
  eating: 5000, playing: 8000, scratching: 6000,
  stretching: 4000, grooming: 8000,
  lookingOutside: 12000, watching: 6000,
}

// Named anchor points — all cat positioning goes through these
const ANCHORS = {
  bowlArea:      { x: 35, y: 8  },
  bedArea:       { x: 6,  y: 22 },
  windowArea:    { x: 70, y: 8  },
  toyArea:       { x: 62, y: 8  },
  scratchingArea:{ x: 13, y: 10 },
  centerFloor:   { x: 47, y: 8  },
  cornerArea:    { x: 8,  y: 8  },
}

// Minimum time (ms) a state must hold before the behavior loop can transition away
const MIN_STATE_DURATION = {
  idle:            6000,
  walking:         4000,
  sleeping:       15000,
  hungry:          8000,
  hungryCritical:  8000,
  lowMood:        10000,
  playing:         5000,
  stretching:      3000,
  lookingOutside:  8000,
  grooming:        6000,
  scratching:      5000,
}

// ── Room themes ──────────────────────────────────────────────────────────────
export const THEMES = [
  { id: 'japandi', name: 'Cozy',   emoji: '🪨', req: null,              unlock: () => true },
  { id: 'cafe',    name: 'Cafe',   emoji: '☕', req: '3-day streak',    unlock: (c) => c.streak >= 3 },
  { id: 'forest',  name: 'Forest', emoji: '🌿', req: '7-day streak',    unlock: (c) => c.streak >= 7 },
  { id: 'ocean',   name: 'Ocean',  emoji: '🌊', req: '5 ⭐',            unlock: (c) => c.purchased.includes('ocean') },
  { id: 'night',   name: 'Night',  emoji: '🌙', req: '10 ⭐',           unlock: (c) => c.purchased.includes('night') },
]

// ── Cat accessories / outfits ─────────────────────────────────────────────────
export const ACCESSORIES = [
  { id: 'none',         name: 'No Outfit',     emoji: '—',  dispEmoji: null, req: null,           unlock: () => true },
  { id: 'green_collar', name: 'Emerald Collar', emoji: '💚', dispEmoji: '💚', req: 'Always',       unlock: () => true },
  { id: 'bell_collar',  name: 'Bell Collar',    emoji: '🔔', dispEmoji: '🔔', req: '3-day streak', unlock: (c) => c.streak >= 3 },
  { id: 'sunny_scarf',  name: 'Sunny Crown',    emoji: '🌻', dispEmoji: '🌻', req: '5 meals',      unlock: (c) => c.mealCount >= 5 },
  { id: 'leaf_collar',  name: 'Forest Cape',    emoji: '🍃', dispEmoji: '🍃', req: '3 ⭐',         unlock: (c) => c.purchased.includes('leaf_collar') },
  { id: 'wave_scarf',   name: 'Ocean Scarf',    emoji: '🌊', dispEmoji: '🌊', req: '5 ⭐',         unlock: (c) => c.purchased.includes('wave_scarf') },
  { id: 'flower_crown', name: 'Bloom Crown',    emoji: '🌸', dispEmoji: '🌸', req: '8 ⭐',         unlock: (c) => c.purchased.includes('flower_crown') },
]

// ── Outfit colour config — used by wardrobe preview ──────────────────────────
export const OUTFIT_CONFIG = {
  green_collar: { color: '#4CAF50', accent: '#C8E6C9', label: 'Collar' },
  bell_collar:  { color: '#8D6E63', accent: '#FFD54F', label: 'Collar' },
  sunny_scarf:  { color: '#FDD835', accent: '#FF8F00', label: 'Crown'  },
  leaf_collar:  { color: '#388E3C', accent: '#A5D6A7', label: 'Cape'   },
  wave_scarf:   { color: '#1976D2', accent: '#90CAF9', label: 'Scarf'  },
  flower_crown: { color: '#EC407A', accent: '#F8BBD0', label: 'Crown'  },
}

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
  return { catState: 'idle', pos: { x: 47, y: 8 }, fullness: 80, mood: 70, energy: 80, catFacing: false, lastUpdatedAt: Date.now() }
}

function loadPet() {
  try {
    const raw = localStorage.getItem(PET_KEY)
    if (!raw) return defaultPet()
    const s = JSON.parse(raw)
    const elapsed = Date.now() - (s.lastUpdatedAt || Date.now())
    const ticks   = Math.min(Math.floor(elapsed / 5000), 720)
    // backward compat: old saves used petState or hunger (0=full, 100=starving)
    let catState = s.catState || s.petState || 'idle'
    let fullness = s.fullness !== undefined ? s.fullness
                 : s.hunger   !== undefined ? 100 - s.hunger
                 : 80
    let { mood, energy } = s
    for (let i = 0; i < ticks; i++) {
      if (catState !== 'eating')   fullness = Math.max(fullness - 2, 0)
      if (catState === 'sleeping') energy   = Math.min(energy + 3, 100)
      else                         energy   = Math.max(energy - 0.2, 0)
    }
    fullness = Math.round(Math.min(100, Math.max(0, fullness)))
    energy   = Math.round(Math.min(100, Math.max(0, energy)))
    mood     = Math.round(Math.min(100, Math.max(0, mood)))
    // Derive initial state from stats (priority order)
    if (fullness < 15)      catState = 'hungryCritical'
    else if (energy < 30)   catState = 'sleeping'
    else if (fullness < 30) catState = 'hungry'
    // Reset transient states — timers don't survive reload; behavior loop re-derives
    else if (['walking','eating','playing','scratching','sleeping',
              'stretching','lying','grooming','lookingOutside','playingIdle',
              'watching','lowMood','hungry','hungryCritical','veryHungry'].includes(catState)) catState = 'idle'
    return { ...s, catState, fullness, mood, energy, lastUpdatedAt: Date.now() }
  } catch { return defaultPet() }
}

function savePet(data) {
  try { localStorage.setItem(PET_KEY, JSON.stringify({ ...data, lastUpdatedAt: Date.now() })) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE-CONSISTENT MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
function pickMessage(catState, fullness, mood, energy) {
  if (catState === 'hungryCritical') return ["I'm starving... 😿", "Please feed me!! 🍜", "So weak from hunger... 😢", "Too hungry to move... 😿"]
  if (catState === 'veryHungry')     return ["I'm starving... 😿", "Please feed me!! 🍜", "So weak... 😢"]  // kept for compat
  if (catState === 'hungry')         return ["I'm hungry... 😿", "Feed me please! 🍜", "My tummy hurts..."]
  if (catState === 'lowMood')        return ["I need some comfort... 😿", "Feeling blue... 🩵", "Can we play? 🧶"]
  if (catState === 'sleeping')       return ["zzz... 😴", "*snores softly* 💤"]
  if (catState === 'eating')         return ["Yum! Thank you! 💕", "Nom nom nom~ 😋", "So delicious! ✨"]
  if (catState === 'playing')        return ["Wheee!! 😸", "So fun! ✨", "Again! Again! 🧶"]
  if (catState === 'scratching')     return ["Ahh~ that's the spot! 😼", "*scratch scratch* 🪵"]
  if (catState === 'stretching')     return ["*stretches lazily* 🐾", "Mmm, that feels good~", "Good morning~ ☀️"]
  if (catState === 'lying')          return ["Comfy here... 😌", "*relaxing* 💕", "So peaceful~", "Don't disturb me 😸"]
  if (catState === 'grooming')       return ["*lick lick lick* 🐱", "Gotta stay clean~ 😺", "Almost done~"]
  if (catState === 'lookingOutside') return ["What's out there? 🪟", "Ooh, a bird! 😸", "*stares intently* 👀"]
  if (catState === 'playingIdle')    return ["*batting at toy* 🐭", "This is fun~ ✨", "Hehe~ 😸"]
  if (catState === 'watching')       return ["*curious stare* 👀", "What was that? 😸", "*ears perked* 🐱"]
  if (energy < 30)   return ["So sleepy... 😴", "I need a nap..."]
  if (mood < 30)     return ["I'm bored... 😐", "Can we play? 🧶"]
  return ["Purr~ 💕", "I love you! 😊", "*stretches lazily* 😺", "Meow~ 🐱", "Head bumps! 💕"]
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE — image-based, state-aware, animated
// ─────────────────────────────────────────────────────────────────────────────
const SPRITE_CFG = {
  walking:        { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  sleeping:       { src: '/sprites/sleep.png',   frames: 4, origH: 123 },
  eating:         { src: '/sprites/eat.png',     frames: 5, origH: 188 },
  playing:        { src: '/sprites/play.png',    frames: 5, origH: 200 },
  scratching:     { src: '/sprites/scratch.png', frames: 5, origH: 247 },
  stretching:     { src: '/sprites/scratch.png', frames: 5, origH: 247 },
  lying:          { src: '/sprites/sleep.png',   frames: 4, origH: 123 },
  grooming:       { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  lookingOutside: { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  playingIdle:    { src: '/sprites/play.png',    frames: 5, origH: 200 },
  watching:       { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  idle:           { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  hungry:         { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  hungryCritical: { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  veryHungry:     { src: '/sprites/walk.png',    frames: 5, origH: 185 },
  lowMood:        { src: '/sprites/walk.png',    frames: 5, origH: 185 },
}

// States where sprite shows as still (no frame cycling); sleeping/lying excluded
// so their breathing animation plays
const STILL_STATES = new Set(['idle', 'hungry', 'hungryCritical', 'veryHungry', 'lowMood', 'lookingOutside', 'watching', 'eating'])
const ORIG_STRIP_W = 1408

function CatSprite({ state }) {
  const key = SPRITE_CFG[state] ? state : 'idle'
  const cfg = SPRITE_CFG[key]
  const origFrameW = ORIG_STRIP_W / cfg.frames
  const scale = CAT_W / origFrameW
  const dispH = Math.round(cfg.origH * scale)
  const totalW = CAT_W * cfg.frames
  const animated = !STILL_STATES.has(key)
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
        overflow: 'hidden',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM SUPPLIES — CSS-drawn objects; only renders owned items
// ─────────────────────────────────────────────────────────────────────────────
function RoomSupplies({ purchased, catState }) {
  const has  = (id) => purchased.includes(id)
  const lit  = (...states) => states.includes(catState) ? 'rm-supply-lit' : ''
  const bowl = lit('hungry', 'hungryCritical', 'eating')
  const Sh   = ({ w }) => <div className="rm-supply-shadow" style={{ width: w }} />

  return (
    <>
      {/* ── BED AREA — left side ─────────────────────────────── */}
      {has('cat_bed') && (
        <div className={`rm-supply ${lit('sleeping')}`} style={{ left: '3%', bottom: '14%' }}>
          {/* outer rim */}
          <div style={{
            width: 72, height: 38, borderRadius: '50%',
            background: 'linear-gradient(160deg, #c49558, #9a7030)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* inner cushion */}
            <div style={{ width: 56, height: 26, borderRadius: '50%',
              background: 'linear-gradient(160deg, #f5e8d0, #e8d4b0)' }} />
          </div>
          <Sh w={64} />
        </div>
      )}

      {has('blanket') && (
        <div className="rm-supply" style={{ left: '10.5%', bottom: '12.5%', zIndex: 3 }}>
          <div style={{
            width: 50, height: 22, transform: 'rotate(-5deg)',
            borderRadius: '8px 12px 6px 10px / 10px 6px 10px 8px',
            background: 'linear-gradient(135deg, #8fb5a8, #7a9e95)',
            boxShadow: '0 3px 7px rgba(0,0,0,0.15)',
          }} />
        </div>
      )}

      {has('brush') && (
        <div className="rm-supply" style={{ left: '15.5%', bottom: '11.5%', zIndex: 3 }}>
          <div style={{ transform: 'rotate(-20deg)', position: 'relative', width: 32, height: 14 }}>
            {/* handle */}
            <div style={{ width: '100%', height: '100%', borderRadius: 5,
              background: 'linear-gradient(90deg, #9a6832, #7a5020)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
            {/* bristles */}
            <div style={{ position: 'absolute', bottom: -4, left: 4, right: 4, height: 5,
              borderRadius: '0 0 3px 3px',
              background: 'repeating-linear-gradient(90deg, #e8e0d0 0px, #e8e0d0 2px, #c0b090 2px, #c0b090 4px)' }} />
          </div>
        </div>
      )}

      {/* ── BOWL AREA — center-left floor ────────────────────── */}
      {has('water_bowl') && (
        <div className={`rm-supply ${bowl}`} style={{ left: '24%', bottom: '8.5%' }}>
          {/* ceramic bowl outer */}
          <div style={{ width: 30, height: 18, borderRadius: '0 0 50% 50%',
            background: 'linear-gradient(180deg, #e2dbd0, #c8bfb0)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            position: 'relative', overflow: 'hidden' }}>
            {/* water surface */}
            <div style={{ position: 'absolute', bottom: 2, left: 3, right: 3, height: 9,
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #a8d4e8, #70b4d0)', opacity: .85 }} />
          </div>
          <Sh w={24} />
        </div>
      )}

      {has('premium_can') && (
        <div className={`rm-supply ${bowl}`} style={{ left: '30%', bottom: '8.5%' }}>
          {/* can body */}
          <div style={{ width: 22, height: 28, borderRadius: '3px 3px 2px 2px',
            background: 'linear-gradient(180deg, #e07850, #c05830)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            position: 'relative', overflow: 'hidden' }}>
            {/* lid */}
            <div style={{ position: 'absolute', top: 0, left: -1, right: -1, height: 5,
              background: '#b04820', borderRadius: '3px 3px 0 0' }} />
            {/* label band */}
            <div style={{ position: 'absolute', top: 9, left: 2, right: 2, height: 11,
              background: 'rgba(255,255,255,0.28)', borderRadius: 2 }} />
          </div>
          <Sh w={18} />
        </div>
      )}

      {/* ── SCRATCHING AREA — left wall ──────────────────────── */}
      {has('scratching_board') && (
        <div className={`rm-supply ${lit('scratching')}`} style={{ left: '7.5%', bottom: '8%' }}>
          {/* base */}
          <div style={{ width: 34, height: 7, borderRadius: 4,
            background: 'linear-gradient(180deg, #9a7830, #7a5c20)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          {/* post */}
          <div style={{ width: 14, height: 48, margin: '-1px auto 0',
            borderRadius: '2px 2px 0 0', position: 'relative',
            background: 'linear-gradient(90deg, #c8a048, #a07830, #c8a048)' }}>
            {[8, 16, 24, 32, 40].map(t => (
              <div key={t} style={{ position: 'absolute', left: 1, right: 1, top: t,
                height: 1, background: 'rgba(0,0,0,0.15)' }} />
            ))}
          </div>
          <Sh w={28} />
        </div>
      )}

      {/* ── TOY AREA — right-center floor ────────────────────── */}
      {has('toy_mouse') && (
        <div className={`rm-supply ${catState === 'playing' ? 'rm-supply-bounce' : ''}`}
             style={{ left: '60%', bottom: '8%' }}>
          <div style={{ position: 'relative', width: 26, height: 18 }}>
            {/* ears */}
            <div style={{ position: 'absolute', top: -7, left: 1,
              width: 11, height: 10, borderRadius: '50%', background: '#b8a8a0' }} />
            <div style={{ position: 'absolute', top: -7, left: 10,
              width: 11, height: 10, borderRadius: '50%', background: '#b8a8a0' }} />
            {/* body */}
            <div style={{ width: '100%', height: '100%',
              borderRadius: '50% 50% 45% 45%',
              background: 'linear-gradient(160deg, #ccc0b8, #a89890)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.18)' }} />
            {/* nose */}
            <div style={{ position: 'absolute', top: 7, left: '50%',
              transform: 'translateX(-50%)',
              width: 5, height: 4, borderRadius: '50%', background: '#e8a0b0' }} />
            {/* tail */}
            <div style={{ position: 'absolute', top: 8, right: -9,
              width: 10, height: 4, borderRadius: '0 50% 50% 0',
              background: '#b8a8a0' }} />
          </div>
          <Sh w={20} />
        </div>
      )}

      {/* ── WINDOW AREA — elevated on sill ───────────────────── */}
      {has('window_cushion') && (
        <div className={`rm-supply ${lit('lookingOutside')}`}
             style={{ left: '55%', bottom: '37%', zIndex: 2 }}>
          {/* cushion */}
          <div style={{ width: 58, height: 16, borderRadius: 8, position: 'relative',
            background: 'linear-gradient(180deg, #c4b0d8, #a898c0)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.22)' }}>
            {/* seam */}
            <div style={{ position: 'absolute', top: '50%', left: 8, right: 8, height: 1,
              background: 'rgba(255,255,255,0.35)' }} />
            {/* button */}
            <div style={{ position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 5, height: 5, borderRadius: '50%',
              background: 'rgba(255,255,255,0.4)' }} />
          </div>
          {/* sill ledge */}
          <div style={{ width: 64, height: 5, margin: '0 auto',
            borderRadius: '0 0 3px 3px', background: '#c8beb2' }} />
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTFIT OVERLAY — CSS-drawn clothing layered over the sprite
//
// Sprite reference (both are 1408px wide originals, displayed at CAT_W=160px):
//   Standing  walk.png  5 frames → display 160 × 105 px  (head on LEFT)
//   Flat      sleep.png 4 frames → display 160 × 56 px   (head on LEFT, lying)
//
// Approximate landmarks (standing, head-on-left):
//   Ear tips  x  8-25   y  0-10
//   Head      x  8-50   y  8-45   center ≈ (28, 27)
//   Neck      x 32-56   y 48-60
//   Body/back x 55-140  y 40-90
//   Tail      x130-160  y 25-65
//
// The parent .rm-cat applies scaleX(-1) when facing left → overlay auto-mirrors.
// ─────────────────────────────────────────────────────────────────────────────
function OutfitOverlay({ accId, isFlat }) {
  if (!accId || accId === 'none') return null

  const wrap = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none', zIndex: 10, overflow: 'visible',
    transform: 'translateZ(0)',
  }

  // ── Emerald Collar — thin green band at neck + small round tag ────
  if (accId === 'green_collar') return (
    <div style={wrap}>
      {isFlat ? (<>
        {/* collar band (cat lying flat — neck visible around x=50-75) */}
        <div style={{ position:'absolute', left:50, top:17, width:26, height:8,
          borderRadius:4, background:'linear-gradient(135deg,#66BB6A,#2E7D32)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
        {/* round tag */}
        <div style={{ position:'absolute', left:61, top:23, width:9, height:9,
          borderRadius:'50%', background:'#A5D6A7', border:'1.5px solid #2E7D32' }} />
      </>) : (<>
        {/* collar band across neck */}
        <div style={{ position:'absolute', left:28, top:50, width:32, height:9,
          borderRadius:5, transform:'rotate(-8deg)',
          background:'linear-gradient(135deg,#66BB6A,#2E7D32)',
          boxShadow:'0 2px 4px rgba(0,0,0,0.3)' }} />
        {/* round metal tag hanging below */}
        <div style={{ position:'absolute', left:42, top:57, width:11, height:11,
          borderRadius:'50%', background:'#C8E6C9',
          border:'1.5px solid #2E7D32', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }} />
      </>)}
    </div>
  )

  // ── Bell Collar — dark leather band + golden bell pendant ─────────
  if (accId === 'bell_collar') return (
    <div style={wrap}>
      {isFlat ? (<>
        <div style={{ position:'absolute', left:50, top:17, width:26, height:8,
          borderRadius:4, background:'linear-gradient(90deg,#795548,#4E342E)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
        {/* small bell */}
        <div style={{ position:'absolute', left:61, top:23, width:9, height:11,
          borderRadius:'3px 3px 5px 5px',
          background:'linear-gradient(180deg,#FFD740,#FF8F00)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
      </>) : (<>
        {/* leather collar band */}
        <div style={{ position:'absolute', left:27, top:50, width:32, height:9,
          borderRadius:5, transform:'rotate(-8deg)',
          background:'linear-gradient(90deg,#795548,#4E342E)',
          boxShadow:'0 2px 4px rgba(0,0,0,0.3)' }} />
        {/* bell body */}
        <div style={{ position:'absolute', left:40, top:57, width:13, height:16,
          borderRadius:'3px 3px 7px 7px',
          background:'linear-gradient(160deg,#FFD740,#FF8F00)',
          boxShadow:'0 2px 5px rgba(0,0,0,0.3)' }} />
        {/* clapper dot inside bell */}
        <div style={{ position:'absolute', left:45, top:71, width:3, height:3,
          borderRadius:'50%', background:'#5D4037' }} />
      </>)}
    </div>
  )

  // ── Sunny Crown — vine headband + sunflowers on top of head ───────
  if (accId === 'sunny_scarf') return (
    <div style={wrap}>
      {isFlat ? (<>
        {/* vine band on lying head */}
        <div style={{ position:'absolute', left:14, top:3, width:34, height:6,
          borderRadius:3, background:'#558B2F' }} />
        {[14, 23, 34].map((l, i) => (
          <div key={i} style={{ position:'absolute', left:l, top:-6, width:11, height:11,
            borderRadius:'50%', background: i === 1 ? '#FDD835' : '#FF7043',
            border:'2px solid white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}>
            <div style={{ position:'absolute', top:3, left:3, width:5, height:5,
              borderRadius:'50%', background: i === 1 ? '#5D4037' : '#FDD835' }} />
          </div>
        ))}
      </>) : (<>
        {/* vine headband across head */}
        <div style={{ position:'absolute', left:4, top:11, width:44, height:9,
          borderRadius:'5px 5px 3px 3px', background:'#558B2F',
          boxShadow:'0 2px 4px rgba(0,0,0,0.2)' }} />
        {/* 4 sunflowers sitting on the headband */}
        {[4, 13, 23, 33].map((l, i) => (
          <div key={i} style={{ position:'absolute', left:l, top:0, width:13, height:13,
            borderRadius:'50%', background: i % 2 === 0 ? '#FF7043' : '#FDD835',
            border:'2px solid white', boxShadow:'0 2px 4px rgba(0,0,0,0.25)' }}>
            <div style={{ position:'absolute', top:3, left:3, width:7, height:7,
              borderRadius:'50%', background: i % 2 === 0 ? '#FDD835' : '#5D4037' }} />
          </div>
        ))}
      </>)}
    </div>
  )

  // ── Forest Cape — green cloak draping over the back + gold clasp ──
  if (accId === 'leaf_collar') return (
    <div style={wrap}>
      {isFlat ? (<>
        {/* cape draped over lying body */}
        <div style={{ position:'absolute', left:48, top:10, width:78, height:30,
          borderRadius:'6px 18px 18px 6px',
          background:'linear-gradient(135deg,#66BB6A,#1B5E20)', opacity:0.9 }} />
        {/* vein line across */}
        <div style={{ position:'absolute', left:60, top:18, width:48, height:2,
          borderRadius:1, background:'rgba(255,255,255,0.22)' }} />
      </>) : (<>
        {/* cape body — covers cat's back and sides */}
        <div style={{ position:'absolute', left:50, top:40, width:88, height:58,
          borderRadius:'4px 26px 22px 4px',
          background:'linear-gradient(145deg,#43A047,#1B5E20)', opacity:0.9 }} />
        {/* collar piece — wraps around neck, slightly lighter */}
        <div style={{ position:'absolute', left:26, top:44, width:36, height:22,
          borderRadius:12, transform:'rotate(-5deg)',
          background:'linear-gradient(135deg,#66BB6A,#2E7D32)',
          boxShadow:'0 2px 5px rgba(0,0,0,0.25)' }} />
        {/* gold clasp at collar center */}
        <div style={{ position:'absolute', left:42, top:51, width:10, height:10,
          borderRadius:'50%', background:'#FFD740',
          border:'1.5px solid #F9A825', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
        {/* cape highlight */}
        <div style={{ position:'absolute', left:60, top:45, width:32, height:2,
          borderRadius:1, background:'rgba(255,255,255,0.18)' }} />
      </>)}
    </div>
  )

  // ── Ocean Scarf — blue scarf around neck with hanging tail ────────
  if (accId === 'wave_scarf') return (
    <div style={wrap}>
      {isFlat ? (<>
        {/* scarf wrapped around neck area */}
        <div style={{ position:'absolute', left:48, top:14, width:30, height:14,
          borderRadius:8, background:'linear-gradient(135deg,#42A5F5,#0D47A1)',
          boxShadow:'0 2px 4px rgba(0,0,0,0.3)' }} />
        {/* white stripe detail */}
        <div style={{ position:'absolute', left:49, top:22, width:30, height:3,
          borderRadius:2, background:'rgba(255,255,255,0.3)' }} />
      </>) : (<>
        {/* scarf loop around neck */}
        <div style={{ position:'absolute', left:22, top:48, width:40, height:16,
          borderRadius:9, transform:'rotate(-7deg)',
          background:'linear-gradient(135deg,#42A5F5,#1565C0)',
          boxShadow:'0 3px 6px rgba(0,0,0,0.3)' }} />
        {/* white stripe on scarf */}
        <div style={{ position:'absolute', left:22, top:55, width:40, height:3,
          borderRadius:2, background:'rgba(255,255,255,0.3)' }} />
        {/* hanging tail piece */}
        <div style={{ position:'absolute', left:30, top:61, width:17, height:36,
          borderRadius:'3px 3px 10px 10px',
          background:'linear-gradient(180deg,#42A5F5,#1E88E5)',
          boxShadow:'0 2px 4px rgba(0,0,0,0.2)' }} />
        {/* stripe on tail */}
        <div style={{ position:'absolute', left:33, top:76, width:11, height:3,
          borderRadius:2, background:'rgba(255,255,255,0.25)' }} />
      </>)}
    </div>
  )

  // ── Bloom Crown — vine headband + colorful flowers ────────────────
  if (accId === 'flower_crown') {
    const standFlowers = [
      { l:3,  c:'#EF5350' },
      { l:14, c:'#FDD835' },
      { l:25, c:'#EC407A' },
      { l:36, c:'#AB47BC' },
    ]
    const flatFlowers = [
      { l:13, c:'#EF5350' },
      { l:22, c:'#FDD835' },
      { l:33, c:'#EC407A' },
    ]
    const flowers = isFlat ? flatFlowers : standFlowers
    return (
      <div style={wrap}>
        {/* vine base band */}
        <div style={{ position:'absolute',
          left: isFlat ? 11 : 2, top: isFlat ? 3 : 10,
          width: isFlat ? 38 : 48, height: 9,
          borderRadius: 5,
          background:'linear-gradient(90deg,#558B2F,#7CB342,#558B2F)' }} />
        {/* flower blossoms on top of band */}
        {flowers.map(({ l, c }, i) => (
          <div key={i} style={{ position:'absolute', left:l, top: isFlat ? -5 : 0,
            width:14, height:14, borderRadius:'50%', background:c,
            border:'2px solid white', boxShadow:'0 2px 5px rgba(0,0,0,0.25)' }}>
            {/* flower centre */}
            <div style={{ position:'absolute', top:4, left:4, width:6, height:6,
              borderRadius:'50%', background:'#FFF9C4' }} />
          </div>
        ))}
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// CAT ACTOR — single component, single catState, one cat on screen at a time
// ─────────────────────────────────────────────────────────────────────────────
function CatActor({ catState, position, facing, hearts, onCatClick, accId }) {
  const showZzz = catState === 'sleeping'
  const eatAnim = catState === 'eating'
  const isFlat  = catState === 'sleeping' || catState === 'lying'

  return (
    <div
      className={`rm-cat${isFlat ? ' rm-cat--flat' : ''}`}
      style={{
        left:            `${position.x}%`,
        bottom:          `${position.y}%`,
        transform:       `translateX(-50%) scaleX(${facing ? -1 : 1})`,
        transformOrigin: 'bottom center',
      }}
      onClick={onCatClick}
    >
      {/* Zzz — only when sleeping */}
      {showZzz && (
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

      {/* Sprite — single source of truth for cat visual */}
      <div className={`rm-cat-body${eatAnim ? ' rm-cat-eating' : ''}${isFlat ? ' rm-cat-body--flat' : ''}`}>
        <CatSprite state={catState} />
      </div>

      {/* Outfit overlay — CSS-drawn clothing on top of sprite */}
      <OutfitOverlay accId={accId} isFlat={isFlat} />

      {/* Floor shadow */}
      <div className="rm-cat-shadow" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE LABELS
// ─────────────────────────────────────────────────────────────────────────────
const STATE_LABEL = {
  idle:           { text: 'Relaxing 😌',           color: '#5A8A5A', bg: '#E8F5E9' },
  walking:        { text: 'Wandering 🐾',           color: '#4A7A9A', bg: '#E8F4FA' },
  sleeping:       { text: 'Sleeping 😴',            color: '#4A5AAA', bg: '#EEF0FA' },
  hungry:         { text: 'Hungry 😿',              color: '#C05A00', bg: '#FFF3E0' },
  hungryCritical: { text: 'Starving!! 😿',          color: '#B02020', bg: '#FEECEB' },
  veryHungry:     { text: 'Starving!! 😿',          color: '#B02020', bg: '#FEECEB' },
  lowMood:        { text: 'Feeling Sad 😿',         color: '#7A6A4A', bg: '#F5F0E8' },
  eating:         { text: 'Eating 😋',              color: '#B84A00', bg: '#FFF3E0' },
  playing:        { text: 'Playing 😸',             color: '#2A7A3A', bg: '#E8F5E9' },
  scratching:     { text: 'Scratching 😼',          color: '#6A1B9A', bg: '#F5EEF8' },
  stretching:     { text: 'Stretching 🐾',          color: '#7A5A9A', bg: '#F0EBF8' },
  lying:          { text: 'Lying Down 🐱',          color: '#5A7A5A', bg: '#EBF5EB' },
  grooming:       { text: 'Grooming 🐾',            color: '#7A8A3A', bg: '#F0F5E0' },
  lookingOutside: { text: 'Looking Outside 🪟',     color: '#3A6A8A', bg: '#E0EEF8' },
  playingIdle:    { text: 'Playing Alone 🐭',       color: '#8A4A2A', bg: '#F8EEE0' },
  watching:       { text: 'Watching... 👀',         color: '#5A5A7A', bg: '#EBEBF8' },
}

// ─────────────────────────────────────────────────────────────────────────────
// CAT STATUS — short human-readable summary of current state
// ─────────────────────────────────────────────────────────────────────────────
function getCatStatus(catState) {
  if (catState === 'hungryCritical') return { text: 'Your cat really needs food.', urgent: true }
  if (catState === 'hungry')         return { text: 'Your cat is hungry.', urgent: true }
  if (catState === 'sleeping')       return { text: 'Your cat is resting.', urgent: false }
  if (catState === 'lowMood')        return { text: 'Your cat could use some comfort.', urgent: false }
  return { text: 'Your cat is doing well today.', urgent: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────
function getRecommendation(fullness, energy, mood, ce) {
  if (fullness < 15) {
    if (ce < FEED_COST) return {
      type: 'urgent', action: 'feed',
      msg: "Your cat is critically hungry! Scan a meal urgently to earn Care Energy ⚡!"
    }
    return { type: 'feed', action: 'feed', msg: "Your cat is starving! Feed it immediately!" }
  }
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
export default function MyRoom({ avatar, xp, streak, mealCount, level, onClose, onLogMeal }) {
  // ── Pet state — ONE variable controls which cat visual is shown ───────────
  const [inited,      setInited]      = useState(false)
  const [catState,    setCatState]    = useState('idle')      // single source of truth
  const [catPosition, setCatPosition] = useState({ x: 47, y: 8 })
  const [catFacing,   setCatFacing]   = useState(false)       // false = right, true = left
  const [fullness,    setFullness]    = useState(80)
  const [mood,        setMood]        = useState(70)
  const [energy,      setEnergy]      = useState(80)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [message,     setMessage]     = useState(null)
  const [showMsg,     setShowMsg]     = useState(false)
  const [xpFlash,     setXpFlash]     = useState(null)
  const [wakeDialog,  setWakeDialog]  = useState(false)
  const [careEnergy,  setCareEnergy]  = useState(loadCE)
  const [hearts,      setHearts]      = useState([])
  const [equippedTheme, setEquippedTheme] = useState(() => {
    try { return localStorage.getItem('zp_theme') || 'japandi' } catch { return 'japandi' }
  })
  const [equippedAcc, setEquippedAcc] = useState(() => {
    try { return localStorage.getItem('zp_acc') || 'green_collar' } catch { return 'green_collar' }
  })

  // ── Purchased supplies ─────────────────────────────────────────────────────
  const purchased = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('zp_purchased') || '[]') } catch { return [] }
  }, [])
  const purchasedRef = useRef(purchased)
  const hasPurchased = useCallback((id) => purchasedRef.current.includes(id), [])

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const p = loadPet()
    setCatState(p.catState || 'idle')
    setCatPosition(p.pos || { x: 47, y: 8 })
    setFullness(p.fullness ?? 80)
    setMood(p.mood)
    setEnergy(p.energy)
    setCatFacing(p.catFacing || p.flipX || false)
    setInited(true)
  }, [])

  // ── Refs (avoid stale closures) ───────────────────────────────────────────
  const stateRef       = useRef('idle')
  const fullnessRef    = useRef(80)
  const energyRef      = useRef(80)
  const moodRef        = useRef(70)
  const catPosRef      = useRef({ x: 47, y: 8 })
  const stateEnteredRef = useRef(Date.now())

  const msgTimer     = useRef(null)
  const stateTimer   = useRef(null)
  const walkTimer    = useRef(null)
  const scratchTimer = useRef(null)
  const wanderTimer  = useRef(null)
  const stateStarted = useRef(Date.now())
  const stateDurRef  = useRef(null)

  useEffect(() => { stateRef.current    = catState;  stateEnteredRef.current = Date.now() }, [catState])
  useEffect(() => { fullnessRef.current = fullness   }, [fullness])
  useEffect(() => { energyRef.current   = energy     }, [energy])
  useEffect(() => { moodRef.current     = mood       }, [mood])
  useEffect(() => { catPosRef.current   = catPosition }, [catPosition])

  // ── Auto-save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inited) return
    savePet({ catState, pos: catPosition, fullness, mood, energy, catFacing,
      stateStartedAt: stateStarted.current, stateDuration: stateDurRef.current })
  }, [catState, fullness, mood, energy, catPosition, catFacing, inited])

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
      setCatState('idle'); stateDurRef.current = null
    }, ms)
  }, [])

  // walkTo: sets catState='walking', then on arrival sets 'idle' as default
  // and fires cb() which may override to a different state
  const walkTo = useCallback((dest, cb) => {
    clearTimeout(walkTimer.current)
    const cur  = catPosRef.current
    const dx   = dest.x - cur.x
    const dist = Math.sqrt(dx * dx + (dest.y - cur.y) ** 2)
    catPosRef.current = dest
    setCatPosition(dest)
    if (dist < 4) { cb?.(); return }
    setCatFacing(dx < 0)
    setCatState('walking')
    walkTimer.current = setTimeout(() => {
      setCatFacing(false)
      setCatState('idle')   // fallback; cb() may override
      cb?.()
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

  // ── Behavior loop — priority-based, stat-driven ───────────────────────────
  useEffect(() => {
    if (!inited) return

    // Mid-action states the loop should not interrupt
    const LOCKED = new Set(['eating', 'playing', 'scratching', 'grooming', 'stretching', 'watching', 'lookingOutside'])

    const id = setInterval(() => {
      const s  = stateRef.current
      const hp = purchasedRef.current
      const fl = fullnessRef.current
      const e  = energyRef.current
      const m  = moodRef.current
      const hasBed     = hp.includes('cat_bed')
      const hasToy     = hp.includes('toy_mouse')
      const hasScratch = hp.includes('scratching_board')
      const hasWindow  = hp.includes('window_cushion')
      const hasBrush   = hp.includes('brush')

      // Never interrupt a mid-action animation
      if (LOCKED.has(s)) return

      // ── Priority 1: Fullness < 15 → hungryCritical (overrides sleeping) ──
      if (fl < 15) {
        if (s === 'hungryCritical') {
          if (Math.random() < 0.2) bubble("I'm starving! Please feed me!! 😿", 3500)
          return
        }
        clearTimeout(stateTimer.current)
        walkTo(ANCHORS.bowlArea, () => {
          setCatState('hungryCritical')
          bubble("I'm starving... Please feed me!! 😿", 4000)
        })
        return
      }

      // ── Priority 2: Energy < 30 → sleeping ──────────────────────────────
      if (e < 30) {
        if (s === 'sleeping') return
        if (s === 'walking')  return
        clearTimeout(stateTimer.current)
        const dest = hasBed ? ANCHORS.bedArea : ANCHORS.centerFloor
        walkTo(dest, () => {
          setCatState('sleeping')
          stateDurRef.current = null
          bubble('😴 Taking a nap...', 2500)
        })
        return
      }

      // ── Priority 3: Fullness < 30 → hungry ──────────────────────────────
      if (fl < 30) {
        if (s === 'walking') return
        if (s === 'hungry') {
          if (Math.random() < 0.15) bubble("I'm hungry... 😿", 3000)
          return
        }
        clearTimeout(stateTimer.current)
        walkTo(ANCHORS.bowlArea, () => {
          setCatState('hungry')
          bubble("I'm hungry... 😿", 3500)
        })
        return
      }

      // ── Priority 4: Mood < 30 → lowMood ─────────────────────────────────
      if (m < 30) {
        if (s === 'walking') return
        if (s === 'lowMood') return
        clearTimeout(stateTimer.current)
        walkTo(ANCHORS.cornerArea, () => {
          setCatState('lowMood')
          bubble('I need some comfort... 😿', 3500)
        })
        return
      }

      // ── Recovery ─────────────────────────────────────────────────────────
      if (s === 'hungryCritical' || s === 'hungry' || s === 'lowMood') {
        setCatState('idle')
        return
      }
      if (s === 'sleeping' && e >= 50) {
        clearTimeout(stateTimer.current)
        setCatState('idle')
        bubble('😺 Up again~ ☀️', 1500)
        return
      }

      if (s === 'sleeping' || s === 'walking') return

      // ── Min duration guard ───────────────────────────────────────────────
      const elapsed = Date.now() - stateEnteredRef.current
      const minDur  = MIN_STATE_DURATION[s] ?? 5000
      if (elapsed < minDur) return

      // ── Active behaviors ─────────────────────────────────────────────────
      const canPlayNow = e >= 50 && m >= 60
      const r = Math.random()

      if (canPlayNow) {
        if (r < 0.28) {
          const dests = [ANCHORS.centerFloor, ANCHORS.windowArea]
          if (hasToy)     dests.push(ANCHORS.toyArea)
          if (hasScratch) dests.push(ANCHORS.scratchingArea)
          walkTo(dests[Math.floor(Math.random() * dests.length)], () => {})

        } else if (r < 0.42 && hasScratch) {
          walkTo(ANCHORS.scratchingArea, () => {
            setCatState('scratching')
            setMood(m => Math.min(m + 6, 100))
            bubble("😼 Ahh~ that's the spot!", 2800)
            stateTimer.current = setTimeout(() => setCatState('idle'), 5000)
          })

        } else if (r < 0.56) {
          const windowDur = hasWindow
            ? 10000 + Math.random() * 5000
            : 7000  + Math.random() * 4000
          walkTo(ANCHORS.windowArea, () => {
            setCatState('lookingOutside')
            bubble("What's out there? 🪟", 3000)
            stateTimer.current = setTimeout(() => setCatState('idle'), windowDur)
          })

        } else if (r < 0.70) {
          setCatState('grooming')
          if (hasBrush) setMood(m => Math.min(m + 3, 100))
          bubble('*lick lick lick* 🐱', 2500)
          stateTimer.current = setTimeout(() => setCatState('idle'), 5000 + Math.random() * 2000)

        } else if (r < 0.84) {
          const cx = catPosRef.current.x
          const destX = cx < 45 ? 55 + Math.random() * 20 : 12 + Math.random() * 20
          walkTo({ x: destX, y: 8 }, () => {
            setCatState('stretching')
            bubble('*stretches lazily* 🐾', 2000)
            stateTimer.current = setTimeout(() => setCatState('idle'), 3000 + Math.random() * 2000)
          })

        } else {
          const cx = catPosRef.current.x
          const destX = cx < 45 ? 55 + Math.random() * 20 : 12 + Math.random() * 20
          walkTo({ x: destX, y: 8 }, () => {})
        }

      } else {
        // Low-energy idle: gentle wander, light grooming
        if (r < 0.45) {
          const cx = catPosRef.current.x
          const destX = cx < 45 ? 48 + Math.random() * 18 : 16 + Math.random() * 20
          walkTo({ x: destX, y: 8 }, () => {})
        } else if (r < 0.70) {
          setCatState('grooming')
          if (hasBrush) setMood(m => Math.min(m + 3, 100))
          bubble('...', 1500)
          stateTimer.current = setTimeout(() => setCatState('idle'), 3000 + Math.random() * 2000)
        }
        // else: stay idle
      }
    }, 3500)

    return () => clearInterval(id)
  }, [inited, walkTo, bubble])

  // ── Game tick — stats only; behavior loop derives state from these ───────
  useEffect(() => {
    if (!inited) return
    const tick = setInterval(() => {
      const s          = stateRef.current
      const hasBowl    = purchasedRef.current.includes('water_bowl')
      const hasBlanket = purchasedRef.current.includes('blanket')
      const hasBed     = purchasedRef.current.includes('cat_bed')

      if (s !== 'eating')   setFullness(f => Math.max(f - (hasBowl ? 1.5 : 2), 0))
      if (s === 'sleeping') setEnergy(e => Math.min(e + (hasBlanket || hasBed ? 4 : 3), 100))
      else                  setEnergy(e => Math.max(e - 0.5, 0))
      // mood: no auto-drain; only changes via interactions
    }, 5000)

    return () => {
      clearInterval(tick)
      clearTimeout(msgTimer.current); clearTimeout(stateTimer.current)
      clearTimeout(walkTimer.current); clearTimeout(scratchTimer.current)
      clearTimeout(wanderTimer.current)
    }
  }, [inited])

  // ── FEED ──────────────────────────────────────────────────────────────────
  const handleFeed = () => {
    if (catState === 'walking') return
    if (fullnessRef.current >= 85) {
      bubble('😸 Already full! Come back later~', 2500); return
    }
    if (catState === 'sleeping') {
      clearTimeout(stateTimer.current); setCatState('idle')
      bubble('😴 Mmm... food?', 1400)
      setTimeout(doFeed, 1500); return
    }
    doFeed()
  }

  const doFeed = () => {
    if (!spendCE(FEED_COST)) return
    clearTimeout(stateTimer.current); clearTimeout(scratchTimer.current)
    const hasCan  = purchasedRef.current.includes('premium_can')
    const feedAmt = hasCan ? 60 : 45
    walkTo(ANCHORS.bowlArea, () => {
      setCatState('eating')
      setFullness(f => Math.min(100, f + feedAmt))
      setMood(m => Math.min(m + 10, 100))
      bubble(`😋 Yum! Fullness +${feedAmt} 💕`, 3500)
      showHearts()
      scheduleIdle('eating')
    })
  }

  // ── PLAY ──────────────────────────────────────────────────────────────────
  const handlePlay = () => {
    if (catState === 'walking') return
    if (catState === 'sleeping') { setWakeDialog(true); return }
    if (energyRef.current < 30) { bubble('😴 Too tired... let me rest.', 3000); return }
    if (catState === 'hungryCritical' || catState === 'hungry') {
      bubble("😿 Too hungry to play! Feed me first!", 2800); return
    }
    if (catState === 'lowMood') {
      bubble("😿 Not feeling up to play right now...", 2800); return
    }
    if (catState === 'playing') { bubble('😸 Already playing!', 1500); return }
    doPlay()
  }

  const doPlay = () => {
    if (!spendCE(PLAY_COST)) return
    clearTimeout(stateTimer.current); clearTimeout(scratchTimer.current)
    const dest = purchasedRef.current.includes('toy_mouse') ? ANCHORS.toyArea : ANCHORS.centerFloor
    walkTo(dest, () => {
      setCatState('playing')
      setMood(m   => Math.min(m + 20, 100))
      setEnergy(e => Math.max(e - 18, 0))
      bubble('😸 Wheee!! So fun! ✨', 3000)
      scheduleIdle('playing')
    })
  }

  const confirmWake = () => {
    setWakeDialog(false); clearTimeout(stateTimer.current); setCatState('idle')
    bubble("😺 Okay okay, I'm up!", 1400)
    setTimeout(doPlay, 1500)
  }

  // ── REST ──────────────────────────────────────────────────────────────────
  const handleRest = () => {
    if (catState === 'sleeping') { bubble('Already sleeping~ zzz 😴', 1500); return }
    clearTimeout(stateTimer.current); clearTimeout(scratchTimer.current)
    if (purchasedRef.current.includes('cat_bed')) {
      walkTo(ANCHORS.bedArea, () => {
        setCatState('sleeping'); stateDurRef.current = null
        bubble('😴 Taking a nap in bed...', 2500)
      })
    } else {
      setCatState('sleeping'); stateDurRef.current = null
      bubble('😴 Taking a little rest...', 2500)
    }
  }

  // ── Cat click ─────────────────────────────────────────────────────────────
  const handleCatClick = () => {
    if (catState === 'walking') return
    if (catState === 'sleeping')  { clearTimeout(stateTimer.current); setCatState('idle'); bubble('😺 Good morning! ☀️', 2000); return }
    if (catState === 'eating')    { bubble('😋 Eating, give me a sec~', 1500); return }
    if (catState === 'playing')   { bubble('😸 Busy playing!', 1500); return }
    if (catState === 'scratching'){ bubble('😼 Scratching, ahh~', 1500); return }
    const msgs = pickMessage(catState, fullness, mood, energy)
    bubble(msgs[Math.floor(Math.random() * msgs.length)])
    if (catState !== 'hungry' && catState !== 'hungryCritical') {
      const hasBrush = purchasedRef.current.includes('brush')
      setMood(m => Math.min(m + (hasBrush ? 10 : 5), 100))
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const label         = STATE_LABEL[catState] || STATE_LABEL.idle
  const isFull        = fullness >= 85
  const canFeed       = careEnergy >= FEED_COST && !isFull
  const canPlay       = careEnergy >= PLAY_COST && energy >= 30
  const fullnessColor = fullness >= 70 ? '#43A047' : fullness >= 30 ? '#FB8C00' : '#E53935'
  const moodColor     = mood   >= 60 ? '#43A047' : mood   >= 30 ? '#FB8C00' : '#E53935'
  const energyColor   = energy >= 60 ? '#2196F3' : energy >= 30 ? '#FF9800' : '#9E9E9E'
  const activeAcc     = ACCESSORIES.find(a => a.id === equippedAcc)

  // Bond XP progress bar
  const currentLevel  = level || 1
  const xpThis        = getLevelXp(currentLevel)
  const xpNext        = getNextLevelXp(currentLevel)
  const xpPct         = xpNext > xpThis ? Math.min(100, Math.round(((xp || 0) - xpThis) / (xpNext - xpThis) * 100)) : 100
  const catStatus     = getCatStatus(catState)
  const needsCare     = ['hungryCritical', 'hungry', 'lowMood'].includes(catState)

  if (!inited) return null

  const scenePx      = 300
  const catBottomPx  = catPosition.y / 100 * scenePx
  const catTopPx     = catBottomPx + CAT_H + 30
  const bubbleBottom = Math.min(catTopPx, scenePx - 70)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="rm-bg" onClick={onClose}>
      <div className="rm-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER with inline close button ──────────────────────────── */}
        <div className="rm-header">
          <span className="rm-title">🐱 My Room</span>
          <button className="rm-close" onClick={onClose}>✕</button>
        </div>

        {/* ── INFO STRIP — Bond XP + Care Energy ─────────────────────────── */}
        <div className="rm-info-strip">
          <div className="rm-bond-info">
            <span className="rm-bond-lv-label">Bond Lv.{currentLevel}</span>
            <div className="rm-bond-bar-track">
              <div className="rm-bond-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="rm-bond-xp-text">{xp || 0} / {xpNext} XP to Lv.{currentLevel + 1}</span>
          </div>
          <div className="rm-ce-info">
            <span className="rm-ce-val">Care Energy ⚡ {careEnergy}</span>
            <span className="rm-ce-hint">
              {careEnergy === 0 ? 'Log a meal to earn Care Energy.' : 'Earn by logging meals.'}
            </span>
          </div>
        </div>

        {/* ── SCENE ──────────────────────────────────────────────────────── */}
        <div className={`rm-scene rm-theme-${equippedTheme}`}>

          <div className="rm-ceiling"/>
          <div className="rm-wall"/>
          <div className="rm-baseboard"/>
          <div className="rm-floor"/>

          {/* ── Owned cat supplies — CSS-drawn, behaviour-aware ── */}
          <RoomSupplies purchased={purchased} catState={catState} />

          {/* Speech bubble */}
          {showMsg && (
            <div
              className="rm-bubble"
              style={{ left: `${catPosition.x}%`, bottom: `${bubbleBottom}px` }}
            >
              {message}
              <span className="rm-bubble-tail"/>
            </div>
          )}

          {/* ── THE ONE CAT ── */}
          <CatActor
            catState={catState}
            position={catPosition}
            facing={catFacing}
            hearts={hearts}
            onCatClick={handleCatClick}
            accId={equippedAcc}
          />

          {/* XP flash */}
          {xpFlash && <div className="rm-xp-flash">{xpFlash}</div>}

          {/* Wake dialog */}
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

          {/* ── Cat status card ─── */}
          <div className={`rm-status-card ${catStatus.urgent ? 'rm-status-urgent' : ''}`}>
            {catStatus.text}
          </div>

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

          {(() => {
            const rec = getRecommendation(fullness, energy, mood, careEnergy)
            const feedAmt    = purchased.includes('premium_can') ? 60 : 45
            const restDisabled = energy >= 100 || catState === 'sleeping'
            const isSleeping   = catState === 'sleeping'
            return (
              <div className="rm-actions">

                <button
                  className={`rm-action-btn ${rec.action === 'feed' ? 'rm-action-primary' : ''}`}
                  onClick={handleFeed}
                  disabled={!canFeed}
                >
                  <div className="rm-action-icon-wrap">
                    <span className="rm-action-icon">🍚</span>
                  </div>
                  <div className="rm-action-info">
                    <span className="rm-action-label">Feed</span>
                    <span className="rm-action-sub">
                      {isFull
                        ? 'Cat is full! Come back later~ 😸'
                        : canFeed
                          ? `Fullness +${feedAmt}`
                          : 'Need 20 Care Energy. Log a meal first.'}
                    </span>
                  </div>
                  <span className={`rm-action-tag ${isFull ? 'rm-tag-free' : canFeed ? 'rm-tag-cost' : 'rm-tag-locked'}`}>
                    {isFull ? 'Full 😸' : canFeed ? '20 ⚡' : 'Need 20 ⚡'}
                  </span>
                </button>

                <button
                  className={`rm-action-btn ${rec.action === 'play' ? 'rm-action-primary' : ''}`}
                  onClick={handlePlay}
                  disabled={!canPlay}
                >
                  <div className="rm-action-icon-wrap">
                    <span className="rm-action-icon">{purchased.includes('toy_mouse') ? '🐭' : '🧶'}</span>
                  </div>
                  <div className="rm-action-info">
                    <span className="rm-action-label">Play</span>
                    <span className="rm-action-sub">
                      {canPlay
                        ? 'Mood +20'
                        : energy < 30
                          ? 'Your cat is too tired to play. Let it rest first.'
                          : 'Need 15 Care Energy. Log a meal first.'}
                    </span>
                  </div>
                  <span className={`rm-action-tag ${canPlay ? 'rm-tag-cost' : 'rm-tag-locked'}`}>
                    {canPlay ? '15 ⚡' : energy < 30 ? 'Rest first' : 'Need 15 ⚡'}
                  </span>
                </button>

                <button
                  className={`rm-action-btn ${rec.action === 'rest' ? 'rm-action-primary' : ''}`}
                  onClick={handleRest}
                  disabled={restDisabled}
                >
                  <div className="rm-action-icon-wrap">
                    <span className="rm-action-icon">😴</span>
                  </div>
                  <div className="rm-action-info">
                    <span className="rm-action-label">{isSleeping ? 'Resting now' : 'Rest'}</span>
                    <span className="rm-action-sub">
                      {energy >= 100
                        ? 'Energy is already full'
                        : isSleeping
                          ? 'Resting peacefully. Energy recovering.'
                          : 'Free · Let your cat rest to recover Energy'}
                    </span>
                  </div>
                  <span className="rm-action-tag rm-tag-free">Free</span>
                </button>

              </div>
            )
          })()}

          {/* ── Log a Meal CTA — shown when CE=0 and cat needs care ─── */}
          {careEnergy === 0 && needsCare && (
            <button
              className="rm-log-cta-btn"
              onClick={() => { onClose(); onLogMeal?.() }}
            >
              🍽️ Log a Meal to Care for Your Cat
            </button>
          )}

          <div className="rm-quote">
            <p className="rm-quote-text">✨ "{getDailyQuote()}"</p>
          </div>

          {/* ── DEV PANEL — only in development build ─────────────────── */}
          {import.meta.env.DEV && (
            <div style={{
              margin: '12px 0 4px', padding: '10px 12px', borderRadius: 10,
              background: '#1a1a2e', color: '#e0e0ff', fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#a0a0ff' }}>🛠 Dev: force stats</div>
              {[
                { label: '🍚 Fullness', val: fullness, set: v => { setFullness(v); fullnessRef.current = v } },
                { label: '⚡ Energy',   val: energy,   set: v => { setEnergy(v);   energyRef.current   = v } },
                { label: '💕 Mood',     val: mood,     set: v => { setMood(v);     moodRef.current     = v } },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 90 }}>{label}</span>
                  <input type="range" min={0} max={100} value={val}
                    onChange={e => set(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ width: 26, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'T1: critical', fl: 8,  e: 60, m: 60 },
                  { label: 'T2: sleep',    fl: 50, e: 15, m: 60 },
                  { label: 'T3: hungry',   fl: 25, e: 60, m: 60 },
                  { label: 'T4: lowMood',  fl: 60, e: 60, m: 15 },
                  { label: 'T5: happy',    fl: 70, e: 70, m: 70 },
                ].map(({ label, fl, e, m }) => (
                  <button key={label}
                    onClick={() => {
                      setFullness(fl); fullnessRef.current = fl
                      setEnergy(e);   energyRef.current   = e
                      setMood(m);     moodRef.current     = m
                    }}
                    style={{
                      padding: '3px 8px', borderRadius: 6, border: 'none',
                      background: '#3a3a6e', color: '#e0e0ff', cursor: 'pointer', fontSize: 11,
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── Bottom close button — always reachable after scrolling ── */}
          <button className="rm-close-bottom" onClick={onClose}>✕ Close</button>

        </div>{/* end rm-body */}
      </div>
    </div>,
    document.body
  )
}
