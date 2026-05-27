import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, AlertCircle, Copy, ChevronRight, Loader2, Calendar, Film, Star, Save,
} from 'lucide-react'
import { castingCallsApi, applicationsApi } from '../lib/api'
import type { FormSchema, FormField } from '../lib/api'
import { errorToast, successToast } from '../lib/swal'
import { OTPFlow } from '../components/OTPFlow'
import { PhotoUploader } from '../components/PhotoUploader'
import { VideoUploader } from '../components/VideoUploader'
import { Skeleton } from '../components/ui/skeleton'
import { useAutosave } from '../hooks/useAutosave'

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

const baseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().min(16, 'Must be at least 16').max(80, 'Must be under 80'),
  city: z.string().min(2, 'City is required'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})
type BaseForm = z.infer<typeof baseSchema>

const COMMON_LANGUAGES = [
  'Hindi', 'English', 'Marathi', 'Gujarati', 'Bengali',
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi',
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px',
  border: '1px solid var(--border)', borderRadius: 9,
  fontSize: 14, color: 'var(--ink)', background: 'var(--white)',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700,
      background: done ? 'var(--green)' : active ? 'var(--navy)' : 'var(--surface)',
      color: done || active ? '#fff' : 'var(--faint)',
      border: done || active ? 'none' : '1.5px solid var(--border)',
    }}>
      {done ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : n}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TalentApplication() {
  const { callId, showSlug, roleSlug } = useParams<{ callId?: string; showSlug?: string; roleSlug?: string }>()
  const isMobile = useWindowWidth() < 768

  // Memoize the casting call identifier to prevent unnecessary re-renders
  const castingCallIdentifier = useMemo(() => {
    if (callId) return { type: 'id', value: callId }
    if (showSlug && roleSlug) return { type: 'slug', value: `${showSlug}/${roleSlug}` }
    return null
  }, [callId, showSlug, roleSlug])

  // Use React Query to fetch and cache the casting call
  const { data: castingCall, isLoading: loadingCall, error: callError } = useQuery({
    queryKey: ['casting-call', castingCallIdentifier],
    queryFn: async () => {
      if (!castingCallIdentifier) throw new Error('No casting call identifier')
      
      if (castingCallIdentifier.type === 'id') {
        const response = await castingCallsApi.getPublic(Number(castingCallIdentifier.value))
        return response.data
      } else {
        const [showSlug, roleSlug] = castingCallIdentifier.value.split('/')
        const response = await castingCallsApi.getBySlug(showSlug, roleSlug)
        return response.data
      }
    },
    enabled: !!castingCallIdentifier,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [phoneToken, setPhoneToken] = useState('')
  const [phase, setPhase] = useState<'verify' | 'details' | 'media' | 'done'>('verify')
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [trackingId, setTrackingId] = useState('')
  const [copied, setCopied] = useState(false)
  const [customResponses, setCustomResponses] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  // tracks which required media field IDs have been uploaded
  const [completedMedia, setCompletedMedia] = useState<Record<string, boolean>>({})

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues, reset } = useForm<BaseForm>({
    resolver: zodResolver(baseSchema) as never,
    defaultValues: { languages: [] as string[] },
  })
  // Only subscribe to languages — not the whole form — to avoid re-rendering on every keystroke
  const selectedLanguages = watch('languages') || []

  // Keep customResponses in a ref so the autosave snapshot can read the latest value
  // without the snapshot function changing identity on every render
  const customResponsesRef = useRef(customResponses)
  useEffect(() => { customResponsesRef.current = customResponses }, [customResponses])

  const verifiedPhoneRef = useRef(verifiedPhone)
  useEffect(() => { verifiedPhoneRef.current = verifiedPhone }, [verifiedPhone])

  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Autosave key based on casting call
  const autosaveKey = useMemo(() => {
    if (!castingCallIdentifier) return 'temp-application'
    return `application-${castingCallIdentifier.type}-${castingCallIdentifier.value}`
  }, [castingCallIdentifier])

  // Stable snapshot — reads current form + state values without being reactive
  const applicationIdRef = useRef(applicationId)
  useEffect(() => { applicationIdRef.current = applicationId }, [applicationId])

  const trackingIdRef = useRef(trackingId)
  useEffect(() => { trackingIdRef.current = trackingId }, [trackingId])

  const getSnapshot = useCallback(() => ({
    formData: getValues(),
    customResponses: customResponsesRef.current,
    verifiedPhone: verifiedPhoneRef.current,
    phase: phaseRef.current,
    applicationId: applicationIdRef.current,
    trackingId: trackingIdRef.current,
  }), [getValues])

  const { clearSaved, getSaved } = useAutosave(autosaveKey, getSnapshot, 2000, phase === 'done')

  // Guard: load saved data exactly once when the casting call first loads
  const hasLoadedSavedData = useRef(false)
  useEffect(() => {
    if (!castingCall || hasLoadedSavedData.current) return
    hasLoadedSavedData.current = true

    const saved = getSaved()
    if (!saved || typeof saved !== 'object') return

    const savedData = saved as {
      formData?: BaseForm
      customResponses?: Record<string, unknown>
      verifiedPhone?: string
      phase?: string
      applicationId?: string
      trackingId?: string
    }
    if (savedData.formData) reset(savedData.formData)
    if (savedData.customResponses) setCustomResponses(savedData.customResponses)
    if (savedData.applicationId) setApplicationId(savedData.applicationId)
    if (savedData.trackingId) setTrackingId(savedData.trackingId)
    if (savedData.verifiedPhone) {
      setVerifiedPhone(savedData.verifiedPhone)
      // Don't restore 'done' phase — done screen needs tracking ID from fresh submit
      const restoredPhase = savedData.phase as typeof phase
      setPhase(restoredPhase === 'done' ? 'details' : restoredPhase || 'details')
    }
    // Show "restored" timestamp
    setLastSaved(new Date())
  }, [castingCall, getSaved, reset])

  const toggleLanguage = (lang: string) => {
    setValue('languages',
      selectedLanguages.includes(lang)
        ? selectedLanguages.filter(l => l !== lang)
        : [...selectedLanguages, lang]
    )
  }

  const onSubmitDetails = async (data: BaseForm) => {
    if (!castingCall) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await applicationsApi.submit({
        casting_call_id: castingCall.id,
        applicant: {
          name: data.name, phone: verifiedPhone,
          email: data.email || undefined,
          age: data.age, city: data.city, languages: data.languages,
        },
        custom_responses: customResponses,
        consent_given: true,
        phone_token: phoneToken || undefined,
      })
      setApplicationId(res.data.id)
      setTrackingId(res.data.tracking_id)
      clearSaved()

      const schema = castingCall.form_schema as FormSchema | null
      const hasMedia = schema?.fields?.some(f => f.type === 'file') ?? true
      if (hasMedia) {
        successToast('Details saved!', 'Now upload your photos and video.')
        setPhase('media')
      } else {
        try { await applicationsApi.complete(res.data.id) } catch { /* non-blocking */ }
        setPhase('done')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      const text = msg || 'Failed to submit. Please try again.'
      setSubmitError(text)
      errorToast('Submission failed', text)
    } finally {
      setSubmitting(false)
    }
  }

  const onInvalidSubmit = () => {
    errorToast('Please fix the errors', 'Fill in all required fields before continuing.')
  }

  const copyId = () => {
    navigator.clipboard.writeText(trackingId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loadingCall) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 560, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={24} width="60%" />
          {[1,2,3,4].map(i => <Skeleton key={i} height={44} borderRadius={10} />)}
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (callError || (!loadingCall && !castingCall)) {
    const errorMessage = callError ? 'This casting call is not available or has closed.' : 'This casting call was not found.'
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rose-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle style={{ width: 26, height: 26, color: 'var(--rose)' }} />
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: 'var(--navy)', margin: '0 0 8px' }}>Not Available</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>{errorMessage}</p>
        </div>
      </div>
    )
  }

  const formSchema = castingCall.form_schema as FormSchema | null
  const bannerUrl = castingCall.banner_url as string | undefined

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <CastingCallHeader castingCall={castingCall} bannerUrl={bannerUrl} isMobile={isMobile} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 style={{ width: 36, height: 36, color: 'var(--green)' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: 'var(--navy)', margin: '0 0 8px' }}>Application Submitted!</h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                Thank you for applying to <strong style={{ color: 'var(--ink)' }}>{castingCall.role as string}</strong> on <strong style={{ color: 'var(--ink)' }}>{castingCall.show as string}</strong>.
              </p>
            </div>
            <div style={{ width: '100%', background: 'var(--blue-lt)', border: '1px solid var(--blue-mid)', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Your Tracking ID</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.1em' }}>{trackingId}</span>
                <button type="button" onClick={copyId} style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--blue)' }}>
                  {copied ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--blue)', margin: '8px 0 0' }}>Save this ID to check your status</p>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
              <p>📱 You'll receive WhatsApp/SMS updates as your application progresses</p>
              <p>⏱ Our team reviews within 3–5 business days</p>
            </div>
            <a href={`/status?id=${trackingId}`} style={{ display: 'block', width: '100%', padding: '13px 0', background: 'var(--navy)', color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
              Track My Application
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Media step: required-upload tracking ────────────────────────────────────
  const fileFields = (formSchema?.fields ?? []).filter((f: FormField) => f.type === 'file')
  const hasCustomFileFields = fileFields.length > 0
  const requiredMediaIds: string[] = hasCustomFileFields
    ? fileFields.filter((f: FormField) => f.required).map((f: FormField) => f.id)
    : ['default-photo', 'default-video']
  const allRequiredDone = requiredMediaIds.every(id => completedMedia[id])
  const markDone = (id: string) => setCompletedMedia(prev => ({ ...prev, [id]: true }))

  // ── Main ────────────────────────────────────────────────────────────────────
  const allPhases = ['verify', 'details', 'media', 'done'] as const
  const phaseIdx = allPhases.indexOf(phase)
  const steps = [
    { label: 'Verify phone',   done: phaseIdx > 0, active: phase === 'verify' },
    { label: 'Your details',   done: phaseIdx > 1, active: phase === 'details' },
    { label: 'Media & extras', done: phaseIdx > 2, active: phase === 'media' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <CastingCallHeader castingCall={castingCall} bannerUrl={bannerUrl} />

      {/* Desktop: two-col, Mobile: single col */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px' : '32px 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 340px', gap: isMobile ? 16 : 28, alignItems: 'flex-start' }}>

        {/* ── Left: form steps ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step progress */}
          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1 }}>
              {steps.map((s, i) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StepDot n={i + 1} active={s.active} done={s.done} />
                    <span style={{ fontSize: 12.5, fontWeight: s.active ? 600 : 400, color: s.active ? 'var(--navy)' : s.done ? 'var(--green)' : 'var(--faint)', whiteSpace: 'nowrap' }}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: s.done ? 'var(--green)' : 'var(--border)', margin: '0 12px' }} />
                  )}
                </div>
              ))}
            </div>
            
            {/* Autosave indicator */}
            {lastSaved && phase !== 'verify' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 16 }}>
                <Save style={{ width: 12, height: 12 }} />
                <span>Saved {lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>

          {/* ── Step 1: Phone verify ───────────────────────────────────────── */}
          {phase === 'verify' && (
            <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: 'var(--navy)', margin: '0 0 6px' }}>Verify your phone</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>We'll send a one-time code to confirm your number</p>
              <OTPFlow
                purpose="application_submit"
                onVerified={(phone, token) => {
                  setVerifiedPhone(phone)
                  setPhoneToken(token)
                  setPhase('details')
                }}
              />
            </div>
          )}

          {/* ── Step 2: Details form ───────────────────────────────────────── */}
          {phase === 'details' && (
            <form onSubmit={handleSubmit(onSubmitDetails, onInvalidSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: 'var(--navy)', margin: '0 0 4px' }}>Your details</h2>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Verified as <strong>{verifiedPhone}</strong></p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Full Name *</label>
                    <input {...register('name')} type="text" placeholder="Your full name" autoComplete="name" style={inputStyle} />
                    {errors.name && <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 3 }}>{errors.name.message}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Age *</label>
                    <input {...register('age')} type="number" min="16" max="80" placeholder="25" inputMode="numeric" style={inputStyle} />
                    {errors.age && <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 3 }}>{errors.age.message}</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>City *</label>
                    <input {...register('city')} type="text" placeholder="Mumbai" autoComplete="address-level2" style={inputStyle} />
                    {errors.city && <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 3 }}>{errors.city.message}</p>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Email <span style={{ fontWeight: 400, color: 'var(--faint)' }}>(optional)</span></label>
                    <input {...register('email')} type="email" placeholder="your@email.com" autoComplete="email" style={inputStyle} />
                    {errors.email && <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 3 }}>{errors.email.message}</p>}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 8 }}>Languages *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {COMMON_LANGUAGES.map(lang => {
                      const sel = selectedLanguages.includes(lang)
                      return (
                        <button key={lang} type="button" onClick={() => toggleLanguage(lang)} style={{
                          padding: '7px 13px', fontSize: 13, borderRadius: 8,
                          border: sel ? 'none' : '1px solid var(--border)',
                          background: sel ? 'var(--navy)' : 'var(--white)',
                          color: sel ? '#fff' : 'var(--ink)',
                          fontWeight: sel ? 600 : 400, cursor: 'pointer',
                          transition: 'all 0.12s', fontFamily: 'inherit',
                        }}>{lang}</button>
                      )
                    })}
                  </div>
                  {errors.languages && <p style={{ fontSize: 12, color: 'var(--rose)', marginTop: 4 }}>{errors.languages.message}</p>}
                </div>

                {/* Custom fields (non-file) */}
                {formSchema?.fields?.filter(f => f.type !== 'file').map((field: FormField) => (
                  <DynamicField
                    key={field.id} field={field}
                    applicationId={null}
                    value={customResponses[field.id]}
                    onChange={val => setCustomResponses(p => ({ ...p, [field.id]: val }))}
                    onPhotoComplete={() => {}} onVideoComplete={() => {}}
                  />
                ))}

                {/* Consent */}
                {formSchema?.settings?.requireConsent !== false && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                    <label style={{ display: 'flex', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" required style={{ marginTop: 2, width: 15, height: 15, accentColor: 'var(--navy)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                        {formSchema?.settings?.consentText || 'I consent to Rusk Media using my submission for casting purposes. I confirm all information provided is accurate.'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {submitError && (
                <div style={{ display: 'flex', gap: 10, background: 'var(--rose-lt)', border: '1px solid #FECACA', borderRadius: 10, padding: 14 }}>
                  <AlertCircle style={{ width: 16, height: 16, color: 'var(--rose)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--rose)' }}>{submitError}</p>
                </div>
              )}

              <button type="submit" disabled={submitting} style={{
                width: '100%', padding: '14px 0', background: 'var(--navy)', color: '#fff',
                border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(15,23,42,.18)', fontFamily: 'inherit',
                transition: 'opacity 0.2s',
              }}>
                {submitting
                  ? <><Loader2 style={{ width: 17, height: 17, animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><ChevronRight style={{ width: 17, height: 17 }} /> Save & Continue to Media</>
                }
              </button>
            </form>
          )}

          {/* ── Step 3: Media upload ───────────────────────────────────────── */}
          {phase === 'media' && applicationId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: 'var(--navy)', margin: '0 0 4px' }}>Upload your media</h2>
                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Your application is saved — now add photos and videos</p>
                </div>

                {hasCustomFileFields && fileFields.map((field: FormField) => (
                  <div key={field.id}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', marginBottom: 8 }}>
                      {field.label} {field.required && <span style={{ color: 'var(--rose)' }}>*</span>}
                    </p>
                    {field.mediaType === 'video'
                      ? <VideoUploader applicationId={applicationId} maxSizeMB={field.maxSizeMB || 200} required={field.required} onComplete={() => markDone(field.id)} />
                      : <PhotoUploader applicationId={applicationId} maxFiles={field.maxFiles || 5} maxSizeMB={field.maxSizeMB || 5} required={field.required} onComplete={() => markDone(field.id)} />
                    }
                  </div>
                ))}

                {!hasCustomFileFields && (
                  <>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', marginBottom: 8 }}>Profile Photos <span style={{ color: 'var(--rose)' }}>*</span></p>
                      <PhotoUploader applicationId={applicationId} maxFiles={5} required onComplete={() => markDone('default-photo')} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)', marginBottom: 8 }}>Self-Tape Video <span style={{ color: 'var(--rose)' }}>*</span></p>
                      <VideoUploader applicationId={applicationId} required onComplete={() => markDone('default-video')} />
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                disabled={completing || !allRequiredDone}
                onClick={async () => {
                  if (!allRequiredDone) {
                    const missing = requiredMediaIds.filter(id => !completedMedia[id])
                    errorToast('Upload required files', `Please upload: ${missing.join(', ')}`)
                    return
                  }
                  setCompleting(true)
                  try {
                    await applicationsApi.complete(applicationId)
                  } catch { /* non-blocking */ }
                  finally { setCompleting(false) }
                  clearSaved()
                  successToast('Application submitted! 🎉', "We'll be in touch within 3–5 business days.")
                  setPhase('done')
                }}
                style={{
                  width: '100%', padding: '14px 0', background: 'var(--navy)', color: '#fff',
                  border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700,
                  cursor: (completing || !allRequiredDone) ? 'not-allowed' : 'pointer',
                  opacity: (completing || !allRequiredDone) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(15,23,42,.18)', fontFamily: 'inherit',
                  transition: 'opacity 0.2s',
                }}
              >
                {completing
                  ? <><Loader2 style={{ width: 17, height: 17, animation: 'spin 1s linear infinite' }} /> Submitting…</>
                  : <><CheckCircle2 style={{ width: 17, height: 17 }} /> Complete Application</>
                }
              </button>
            </div>
          )}
        </div>

        {/* ── Right: casting call info card ─────────────────────────────────── */}
        <div style={{ position: isMobile ? 'static' : 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14, order: isMobile ? -1 : 0 }}>
          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Film style={{ width: 13, height: 13, color: 'var(--blue)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{castingCall.show as string}</span>
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: 'var(--navy)', margin: 0, lineHeight: 1.3 }}>{castingCall.title as string}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Role: <strong style={{ color: 'var(--ink)' }}>{castingCall.role as string}</strong></p>
              </div>

              {!!castingCall.description && (
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {String(castingCall.description)}
                </p>
              )}
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>Tips for a strong application</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Use a recent, clear headshot with good lighting',
                'Record your self-tape in a quiet space with even lighting',
                'Speak clearly and naturally — be yourself',
                'Double-check your city and contact details',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <Star style={{ width: 12, height: 12, color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Casting call header ──────────────────────────────────────────────────────

function CastingCallHeader({ castingCall, bannerUrl, isMobile }: { castingCall: Record<string, unknown>; bannerUrl?: string; isMobile: boolean }) {
  return (
    <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
      {bannerUrl && (
        <div style={{ width: '100%', aspectRatio: '4/1', overflow: 'hidden', position: 'relative' }}>
          <img src={bannerUrl} alt="Casting banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(15,23,42,.72))' }} />
          <div style={{ position: 'absolute', bottom: isMobile ? 14 : 22, left: isMobile ? 16 : 28, right: isMobile ? 16 : 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <Film style={{ width: 14, height: 14, color: 'rgba(255,255,255,.8)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{castingCall.show as string}</span>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: isMobile ? 20 : 28, color: '#fff', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,.3)' }}>{castingCall.title as string}</h1>
          </div>
        </div>
      )}
      {!bannerUrl && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <Film style={{ width: 13, height: 13, color: 'var(--blue)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{castingCall.show as string}</span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: 'var(--navy)', margin: '0 0 4px' }}>{castingCall.title as string}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Role: <strong style={{ color: 'var(--ink)' }}>{castingCall.role as string}</strong></p>
          {!!castingCall.deadline && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#D97706', fontWeight: 500 }}>
              <Calendar style={{ width: 12, height: 12 }} />
              Deadline: {new Date(String(castingCall.deadline)).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────

function DynamicField({ field, value, onChange, applicationId, onPhotoComplete, onVideoComplete }: {
  field: FormField; value: unknown; onChange: (val: unknown) => void
  applicationId: string | null; onPhotoComplete: (ids: string[]) => void; onVideoComplete: (id: string, storagePath: string) => void
}) {
  const labelEl = (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>
      {field.label} {field.required && <span style={{ color: 'var(--rose)' }}>*</span>}
    </label>
  )

  switch (field.type) {
    case 'text': case 'email': case 'tel':
      return <div>{labelEl}<input type={field.type} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} style={inputStyle} /></div>
    case 'number':
      return <div>{labelEl}<input type="number" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} min={field.validation?.min} max={field.validation?.max} required={field.required} inputMode="numeric" style={inputStyle} /></div>
    case 'textarea':
      return <div>{labelEl}<textarea value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} required={field.required} rows={3} style={{ ...inputStyle, resize: 'none' }} /></div>
    case 'select':
      return <div>{labelEl}<select value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} style={{ ...inputStyle, cursor: 'pointer' }}><option value="">Select…</option>{field.options?.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
    case 'multiselect':
      return <div>{labelEl}<div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{field.options?.map(opt => { const sel = ((value as string[]) || []).includes(opt); return <button key={opt} type="button" onClick={() => { const c = (value as string[]) || []; onChange(sel ? c.filter(v => v !== opt) : [...c, opt]) }} style={{ padding: '7px 13px', fontSize: 13, borderRadius: 8, border: sel ? 'none' : '1px solid var(--border)', background: sel ? 'var(--navy)' : 'var(--white)', color: sel ? '#fff' : 'var(--ink)', fontWeight: sel ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>{opt}</button> })}</div></div>
    case 'file':
      if (!applicationId) return null
      return <div>{labelEl}{field.mediaType === 'video' ? <VideoUploader applicationId={applicationId} maxSizeMB={field.maxSizeMB || 200} required={field.required} onComplete={onVideoComplete} /> : <PhotoUploader applicationId={applicationId} maxFiles={field.maxFiles || 5} maxSizeMB={field.maxSizeMB || 5} required={field.required} onComplete={onPhotoComplete} />}</div>
    case 'checkbox':
      return <label style={{ display: 'flex', gap: 10, cursor: 'pointer' }}><input type="checkbox" checked={(value as boolean) ?? false} onChange={e => onChange(e.target.checked)} required={field.required} style={{ marginTop: 2, width: 15, height: 15, accentColor: 'var(--navy)', flexShrink: 0 }} /><span style={{ fontSize: 13, color: 'var(--muted)' }}>{field.label}</span></label>
    case 'date':
      return <div>{labelEl}<input type="date" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} style={inputStyle} /></div>
    default: return null
  }
}
