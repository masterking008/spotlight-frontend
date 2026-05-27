import { useState, useRef, useEffect, useCallback } from 'react'
import { Phone, Shield, RefreshCw, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { otpApi } from '../lib/api'

interface OTPFlowProps {
  purpose: 'application_submit' | 'status_check'
  onVerified: (phone: string, phoneToken: string) => void
  initialPhone?: string
}

type Step = 'phone' | 'otp' | 'verified'

const RESEND_COOLDOWN = 60 // seconds

export function OTPFlow({ purpose, onVerified, initialPhone = '' }: OTPFlowProps) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState(initialPhone)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const digitRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const formatPhone = (raw: string) => {
    // Normalize to E.164-ish for India — prepend +91 if bare 10 digits
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) return `+91${digits}`
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
    return raw.trim()
  }

  const sendOTP = useCallback(async () => {
    const formatted = formatPhone(phone)
    if (formatted.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    setLoading(true)
    setError('')
    try {
      await otpApi.send(formatted, purpose)
      setPhone(formatted)
      setStep('otp')
      setCooldown(RESEND_COOLDOWN)
      setTimeout(() => digitRefs.current[0]?.focus(), 100)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [phone, purpose])

  const verifyOTP = useCallback(async () => {
    const code = otp.join('')
    if (code.length < 6) {
      setError('Please enter all 6 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await otpApi.verify(phone, code, purpose)
      setStep('verified')
      onVerified(phone, data.phone_token)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Incorrect OTP. Please try again.')
      // Clear the OTP boxes on error
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => digitRefs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }, [otp, phone, purpose, onVerified])

  const handleDigitInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => { if (i < 6) newOtp[i] = d })
      setOtp(newOtp)
      digitRefs.current[Math.min(digits.length, 5)]?.focus()
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) digitRefs.current[index + 1]?.focus()
  }

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      if (step === 'phone') sendOTP()
      else if (step === 'otp') verifyOTP()
    }
  }

  if (step === 'verified') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">Phone verified</p>
          <p className="text-sm text-gray-500 mt-0.5">{phone}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {step === 'phone' && (
        <>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Verify your phone number</p>
              <p className="text-sm text-gray-500 mt-0.5">
                We'll send a 6-digit code to confirm your number. No account needed.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Phone number
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 font-medium">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phone.replace(/^\+91/, '')}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                placeholder="9876543210"
                inputMode="tel"
                autoComplete="tel"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={sendOTP}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {loading ? 'Sending...' : 'Send verification code'}
          </button>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Enter verification code</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Sent to <span className="font-medium text-gray-700">{phone}</span>
                {' '}·{' '}
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
                  className="text-blue-600 hover:underline"
                >
                  Change
                </button>
              </p>
            </div>
          </div>

          {/* 6-digit input boxes */}
          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { digitRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleDigitInput(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={`
                  w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                  ${digit ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50'}
                  focus:border-blue-500 focus:bg-white
                `}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="button"
            onClick={verifyOTP}
            disabled={loading || otp.join('').length < 6}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? 'Verifying...' : 'Verify code'}
          </button>

          {/* Resend */}
          <div className="text-center">
            {cooldown > 0 ? (
              <p className="text-sm text-gray-400">
                Resend in {cooldown}s
              </p>
            ) : (
              <button
                type="button"
                onClick={sendOTP}
                disabled={loading}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mx-auto"
              >
                <RefreshCw className="w-3 h-3" /> Resend code
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
