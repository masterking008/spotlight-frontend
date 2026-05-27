import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signIn, user } = useAuth()
  const error = searchParams.get('error')

  useEffect(() => { if (user) navigate('/') }, [user, navigate])

  const handleMicrosoftLogin = async () => {
    setLoading(true)
    setLoginError(null)
    try {
      await signIn()
    } catch (err: any) {
      setLoginError(err?.message ?? 'Sign in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif" }}>
      <div className="w-full max-w-sm space-y-5">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--navy)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: 'var(--navy)', letterSpacing: '-0.3px', lineHeight: 1 }}>Spotlight</div>
            <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--faint)', marginTop: 2 }}>Casting</div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 space-y-5" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.3px' }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Sign in with your Rusk Media account</p>
          </div>

          {(error || loginError) && (
            <div className="rounded-xl px-4 py-3 text-[13px]" style={{ background: 'var(--rose-lt)', border: '1px solid #FECACA', color: 'var(--rose)' }}>
              {loginError ?? 'Authentication failed. Please try again.'}
            </div>
          )}

          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--white)', border: '1px solid var(--border-2)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-2)', borderTopColor: 'var(--blue)' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Microsoft'}
          </button>

          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--blue-lt)' }}>
            <svg className="shrink-0" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--blue)" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ fontSize: 12, color: 'var(--blue)' }}>
              Use your <strong>@ruskmedia.com</strong> Microsoft account to sign in.
            </p>
          </div>
        </div>

        <p className="text-center" style={{ fontSize: 12, color: 'var(--faint)' }}>
          Rusk Media Pvt. Ltd. · Internal use only
        </p>
      </div>
    </div>
  )
}
