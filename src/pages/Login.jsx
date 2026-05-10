import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Detect in-app browsers (Messenger, LINE, Instagram, WeChat, etc.)
function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|LinkedInApp|Twitter|Snapchat/i.test(ua)
    || (/wv|WebView/i.test(ua) && !/Chrome\/\d/.test(ua))
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent)
}

// Try to open current URL in the system browser
function openInSystemBrowser() {
  const url = window.location.href

  if (isAndroid()) {
    // Android: intent:// forces Chrome/default browser
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
    window.location.href = intentUrl
  } else {
    // iOS: safari-https:// scheme opens Safari directly
    window.location.href = url.replace(/^https:\/\//, 'safari-https://')
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [openFailed, setOpenFailed] = useState(false)

  const inApp = isInAppBrowser()
  const siteUrl = window.location.origin + window.location.pathname

  const handleOpenBrowser = () => {
    openInSystemBrowser()
    // If it didn't navigate away after 1.5s, fall back to copy-link UI
    setTimeout(() => setOpenFailed(true), 1500)
  }

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(siteUrl).catch(() => {})
    prompt('複製連結後貼到 Safari 或 Chrome：', siteUrl)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  return (
    <div className="login-bg">
      <div className="login-box">
        <div className="login-logo">🌿</div>
        <h1 className="login-title">ZENPLATE</h1>
        <p className="login-sub">Your mindful nutrition companion</p>

        {/* ── In-app browser: show open-in-browser prompt ── */}
        {inApp && (
          <div className="inapp-warning">
            <p className="inapp-warning-title">🌐 在瀏覽器開啟以使用 Google 登入</p>
            <p className="inapp-warning-body">
              目前在 App 內建瀏覽器，Google 登入需要 Safari 或 Chrome。
            </p>
            <button className="inapp-open-btn" onClick={handleOpenBrowser}>
              在 Safari 中開啟 →
            </button>
            {openFailed && (
              <button className="inapp-copy-btn" onClick={handleCopyLink} style={{ marginTop: 8 }}>
                📋 複製連結（手動開啟）
              </button>
            )}
          </div>
        )}

        <button className="google-btn" onClick={handleGoogleLogin}
          disabled={googleLoading || inApp}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.8 13.6-4.7l-6.3-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.6-3.5-11.2-8.2l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.3 5.2C40.8 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="login-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          <input type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} className="login-input" required />
          <input type="password" placeholder="Password (min 6 chars)" value={password}
            onChange={e => setPassword(e.target.value)} className="login-input" required />
          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-message">{message}</p>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button className="login-toggle" onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}>
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  )
}
