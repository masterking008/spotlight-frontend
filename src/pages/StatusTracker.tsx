import { useState } from 'react'
import {
  CheckCircle2, Clock, XCircle, Star, ChevronRight,
  Copy, AlertCircle, Calendar, Hash, Clapperboard,
} from 'lucide-react'
import { applicationsApi } from '../lib/api'
import type { StatusResponse } from '../lib/api'
import { OTPFlow } from '../components/OTPFlow'

// ─── Status pipeline visual ───────────────────────────────────────────────────

const PIPELINE = [
  { key: 'new',         label: 'Received',       icon: <CheckCircle2 style={{ width: 16, height: 16 }} /> },
  { key: 'reviewing',   label: 'Under review',   icon: <Clock style={{ width: 16, height: 16 }} /> },
  { key: 'shortlisted', label: 'Shortlisted',    icon: <Star style={{ width: 16, height: 16 }} /> },
  { key: 'pitched',     label: 'Final review',   icon: <ChevronRight style={{ width: 16, height: 16 }} /> },
  { key: 'approved',    label: 'Approved',       icon: <CheckCircle2 style={{ width: 16, height: 16 }} /> },
  { key: 'cast',        label: 'Cast!',          icon: <Clapperboard style={{ width: 16, height: 16 }} /> },
]

const NEXT_STEPS: Record<string, string> = {
  new:         'Your application is in the queue. Our team usually reviews within 2–3 business days.',
  reviewing:   'Our casting team is actively looking at your application. Hang tight!',
  shortlisted: "Great news! You've been shortlisted. You may be contacted for a callback or audition.",
  pitched:     "You're in the final round! Decision makers are reviewing selected candidates.",
  approved:    'Congratulations! Your application has been approved. Expect a call from our team soon.',
  cast:        "You've been selected for this role. Our team will reach out with contract details.",
  rejected:    "Thank you for applying. You weren't selected for this role — but keep an eye out for future castings!",
}

function StatusResult({ data }: { data: StatusResponse }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(data.tracking_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const pipelineIdx = PIPELINE.findIndex(p => p.key === data.status)
  const isRejected = data.status === 'rejected'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Casting call info */}
      {data.casting_call && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Applied for</p>
          <p style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 14 }}>{data.casting_call.title}</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{data.casting_call.show} · {data.casting_call.role}</p>
        </div>
      )}

      {/* Status pipeline */}
      {!isRejected ? (
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Your journey</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PIPELINE.map((step, idx) => {
              const done = idx < pipelineIdx
              const active = idx === pipelineIdx
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: active ? 'var(--navy)' : done ? 'var(--green)' : 'var(--surface)',
                    color: active || done ? '#fff' : 'var(--faint)',
                    transition: 'background 0.15s',
                    boxShadow: active ? '0 2px 8px rgba(15,23,42,.18)' : 'none',
                  }}>
                    {step.icon}
                  </div>
                  <span style={{
                    fontSize: 13.5, fontWeight: 500, flex: 1, padding: '10px 0',
                    color: active ? 'var(--navy)' : done ? 'var(--green)' : 'var(--faint)',
                  }}>
                    {step.label}
                  </span>
                  {active && (
                    <span style={{
                      fontSize: 11.5, fontWeight: 600,
                      background: 'var(--blue-lt)', color: 'var(--blue)',
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      Current
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--rose-lt)', border: '1px solid #FECACA', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <XCircle style={{ width: 20, height: 20, color: 'var(--rose)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--rose)', fontSize: 14 }}>Not selected</p>
            <p style={{ fontSize: 13, color: 'var(--rose)', marginTop: 4, lineHeight: 1.5 }}>{NEXT_STEPS.rejected}</p>
          </div>
        </div>
      )}

      {/* Next steps */}
      {!isRejected && (
        <div style={{ background: 'var(--blue-lt)', border: '1px solid var(--blue-mid)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>What's next</p>
          <p style={{ fontSize: 13, color: 'var(--navy)', lineHeight: 1.6 }}>{NEXT_STEPS[data.status] || NEXT_STEPS.new}</p>
        </div>
      )}

      {/* Meta info */}
      <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Hash style={{ width: 15, height: 15, color: 'var(--faint)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--navy)', letterSpacing: '0.05em' }}>{data.tracking_id}</span>
          <button
            type="button"
            onClick={copy}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Copy style={{ width: 13, height: 13 }} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <Calendar style={{ width: 15, height: 15, flexShrink: 0 }} />
          Submitted {new Date(data.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {data.last_updated && data.last_updated !== data.submitted_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
            <Clock style={{ width: 15, height: 15, flexShrink: 0 }} />
            Updated {new Date(data.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatusTracker() {
  const [step, setStep] = useState<'otp' | 'id-entry' | 'result'>('otp')
  const [phone, setPhone] = useState('')
  const [phoneToken, setPhoneToken] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [result, setResult] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerified = (verifiedPhone: string, token: string) => {
    setPhone(verifiedPhone)
    setPhoneToken(token)
    setStep('id-entry')
  }

  const handleCheck = async () => {
    if (!trackingId.trim()) {
      setError('Please enter your tracking ID')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await applicationsApi.checkStatus({
        phone_token: phoneToken,
        tracking_id: trackingId.trim().toUpperCase(),
      })
      setResult(res.data)
      setStep('result')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Application not found. Check your tracking ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--navy)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 14px rgba(15,23,42,.18)' }}>
            <Clapperboard style={{ width: 28, height: 28, color: '#fff' }} />
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0 }}>Track your application</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            {step === 'otp' && 'Verify your phone number to check your status'}
            {step === 'id-entry' && `Verified: ${phone}`}
            {step === 'result' && "Here's your current status"}
          </p>
        </div>

        {/* OTP step */}
        {step === 'otp' && (
          <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
            <OTPFlow
              purpose="status_check"
              onVerified={handleVerified}
            />
          </div>
        )}

        {/* Tracking ID entry */}
        {step === 'id-entry' && (
          <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>Tracking ID</label>
              <input
                type="text"
                value={trackingId}
                onChange={e => { setTrackingId(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                placeholder="e.g. ABC123XY"
                autoFocus
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1px solid var(--border)', borderRadius: 10,
                  fontFamily: 'monospace', fontSize: 20, textAlign: 'center', letterSpacing: '0.15em',
                  color: 'var(--navy)', background: 'var(--white)',
                  outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase',
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6, textAlign: 'center' }}>
                You received this ID when you submitted your application
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--rose-lt)', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px' }}>
                <AlertCircle style={{ width: 16, height: 16, color: 'var(--rose)', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: 'var(--rose)' }}>{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheck}
              disabled={loading || !trackingId.trim()}
              style={{
                width: '100%', padding: '12px 0',
                background: 'var(--navy)', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: loading || !trackingId.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !trackingId.trim() ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? 'Checking...' : 'Check status'}
            </button>

            <button
              type="button"
              onClick={() => setStep('otp')}
              style={{ width: '100%', fontSize: 13, color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              ← Use a different number
            </button>
          </div>
        )}

        {/* Result */}
        {step === 'result' && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StatusResult data={result} />
            <button
              type="button"
              onClick={() => { setStep('id-entry'); setResult(null); setTrackingId('') }}
              style={{
                width: '100%', padding: '12px 0',
                background: 'var(--white)', border: '1px solid var(--border)',
                color: 'var(--muted)', borderRadius: 10, fontSize: 13,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >
              Check another application
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
