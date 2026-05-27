import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle2, Sparkles, Upload, X, FileText, Loader2, Eye, Film, Calendar, Star, ChevronRight, Radio, BookOpen, XCircle, RotateCcw, UserPlus } from 'lucide-react'
import { castingCallsApi, aiApi } from '../lib/api'
import type { FormSchema, FormField, Collaborator, CastingCall } from '../lib/api'
import { useAuth } from '../lib/auth'
import { FormBuilder } from '../components/FormBuilder'
import { BannerCropper } from '../components/BannerCropper'
import { successToast, errorToast } from '../lib/swal'
import { CollaborateDialog } from '../components/CollaborateDialog'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  show: z.string().min(2, 'Show name is required'),
  role: z.string().min(2, 'Role is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  deadline: z.string().optional(),
})
type FormData = z.infer<typeof schema>

type CastingStatus = 'draft' | 'open' | 'closed'

const STATUS_META: Record<CastingStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:  { label: 'Draft',  color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  open:   { label: 'Live',   color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  closed: { label: 'Closed', color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF' },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        ...(props.disabled ? { background: 'var(--surface)', color: 'var(--muted)' } : {}),
        ...(focused ? { borderColor: '#93C5FD', boxShadow: '0 0 0 3px rgba(37,99,235,.08)' } : {}),
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: 'none',
        ...(props.disabled ? { background: 'var(--surface)', color: 'var(--muted)' } : {}),
        ...(focused ? { borderColor: '#93C5FD', boxShadow: '0 0 0 3px rgba(37,99,235,.08)' } : {}),
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        cursor: 'pointer',
        ...(focused ? { borderColor: '#93C5FD', boxShadow: '0 0 0 3px rgba(37,99,235,.08)' } : {}),
        ...props.style,
      }}
      onFocus={e => { setFocused(true); props.onFocus?.(e) }}
      onBlur={e => { setFocused(false); props.onBlur?.(e) }}
    />
  )
}

// ─── AI Brief Panel ───────────────────────────────────────────────────────────

function AiBriefPanel({
  brief, setBrief, briefFile, setBriefFile, onGenerate, loading, done, setDone,
}: {
  brief: string
  setBrief: (v: string) => void
  briefFile: File | null
  setBriefFile: (f: File | null) => void
  onGenerate: () => void
  loading: boolean
  done: boolean
  setDone: (v: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const fileRef = useState<HTMLInputElement | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.pdf') || f.name.endsWith('.docx'))) {
      setBriefFile(f)
    }
  }

  const canGenerate = (brief.trim().length > 10 || !!briefFile) && !loading

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: open ? 'var(--white)' : '#FAFAF9',
      flexShrink: 0,
      transition: 'background 0.2s',
    }}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setDone(false) }}
        style={{
          width: '100%', padding: '10px 28px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED, #2563EB)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles style={{ width: 13, height: 13, color: '#fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)' }}>AI Fill</span>
          <span style={{ fontSize: 12, color: 'var(--faint)', marginLeft: 8 }}>
            Paste a brief or upload a PDF/DOCX — AI will fill the form and generate questions
          </span>
        </div>
        {done && (
          <span style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 style={{ width: 13, height: 13 }} /> Filled
          </span>
        )}
        <span style={{ fontSize: 18, color: 'var(--faint)', lineHeight: 1 }}>{open ? '−' : '+'}</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div style={{ padding: '0 28px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Textarea */}
          <div style={{ flex: 1 }}>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder="Paste your casting brief here… e.g. 'Looking for a male actor aged 25-35 for a lead role in a crime thriller series set in Mumbai. Must be fluent in Hindi and English. Shooting starts March 2025…'"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink)',
                background: 'var(--white)', outline: 'none',
                resize: 'none', boxSizing: 'border-box', lineHeight: 1.55,
              }}
              onFocus={e => (e.target.style.borderColor = '#93C5FD')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* File drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef[0]?.click()}
            style={{
              width: 160, flexShrink: 0,
              height: 84,
              border: '1.5px dashed var(--border)',
              borderRadius: 8, cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'var(--surface)',
              transition: 'border-color 0.15s',
              position: 'relative',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#93C5FD')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <input
              type="file"
              accept=".pdf,.docx"
              style={{ display: 'none' }}
              ref={el => { fileRef[0] = el }}
              onChange={e => { if (e.target.files?.[0]) setBriefFile(e.target.files[0]) }}
            />
            {briefFile ? (
              <>
                <FileText style={{ width: 20, height: 20, color: 'var(--blue)' }} />
                <span style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 500, textAlign: 'center', padding: '0 6px', wordBreak: 'break-all' }}>
                  {briefFile.name.length > 20 ? briefFile.name.slice(0, 18) + '…' : briefFile.name}
                </span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setBriefFile(null) }}
                  style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                >
                  <X style={{ width: 12, height: 12, color: 'var(--muted)' }} />
                </button>
              </>
            ) : (
              <>
                <Upload style={{ width: 18, height: 18, color: 'var(--faint)' }} />
                <span style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center' }}>PDF or DOCX</span>
                <span style={{ fontSize: 10, color: 'var(--faint)' }}>drag & drop</span>
              </>
            )}
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGenerate}
            style={{
              flexShrink: 0,
              padding: '0 18px',
              height: 84,
              background: canGenerate ? 'linear-gradient(135deg, #7C3AED, #2563EB)' : 'var(--surface)',
              color: canGenerate ? '#fff' : 'var(--faint)',
              border: 'none', borderRadius: 8,
              fontSize: 12.5, fontWeight: 600,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity 0.15s',
              fontFamily: 'inherit',
              minWidth: 100,
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <Sparkles style={{ width: 18, height: 18 }} />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Form Preview Modal ───────────────────────────────────────────────────────

const COMMON_LANGUAGES = [
  'Hindi', 'English', 'Marathi', 'Gujarati', 'Bengali',
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi',
]

function PreviewDynamicField({ field }: { field: FormField }) {
  const labelEl = (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
      {field.label} {field.required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
  )
  const si: React.CSSProperties = {
    width: '100%', padding: '10px 13px', border: '1px solid #E2E8F0',
    borderRadius: 9, fontSize: 14, color: '#0F172A', background: '#fff',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  switch (field.type) {
    case 'text': case 'email': case 'tel': case 'number':
      return <div>{labelEl}<input type={field.type} placeholder={field.placeholder} disabled style={{ ...si, cursor: 'not-allowed', background: '#F8FAFC' }} /></div>
    case 'textarea':
      return <div>{labelEl}<textarea placeholder={field.placeholder} disabled rows={3} style={{ ...si, resize: 'none', cursor: 'not-allowed', background: '#F8FAFC' }} /></div>
    case 'select':
      return <div>{labelEl}<select disabled style={{ ...si, cursor: 'not-allowed', background: '#F8FAFC' }}><option>Select…</option>{field.options?.map(o => <option key={o}>{o}</option>)}</select></div>
    case 'multiselect':
      return <div>{labelEl}<div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{field.options?.map(opt => <button key={opt} type="button" disabled style={{ padding: '7px 13px', fontSize: 13, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A', cursor: 'default', fontFamily: 'inherit' }}>{opt}</button>)}</div></div>
    case 'date':
      return <div>{labelEl}<input type="date" disabled style={{ ...si, cursor: 'not-allowed', background: '#F8FAFC' }} /></div>
    case 'checkbox':
      return <label style={{ display: 'flex', gap: 10, cursor: 'default' }}><input type="checkbox" disabled style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0 }} /><span style={{ fontSize: 13, color: '#64748B' }}>{field.label}</span></label>
    case 'file':
      return <div>{labelEl}<div style={{ border: '1.5px dashed #CBD5E1', borderRadius: 10, padding: '24px 16px', textAlign: 'center', background: '#F8FAFC', color: '#94A3B8', fontSize: 13 }}>📎 {field.mediaType === 'video' ? 'Video upload' : 'Photo upload'} field</div></div>
    default: return null
  }
}

function FormPreviewModal({
  open, onClose, title, show, role, description, deadline, bannerUrl, formSchema,
}: {
  open: boolean; onClose: () => void
  title: string; show: string; role: string; description: string; deadline: string
  bannerUrl: string; formSchema: FormSchema | null
}) {
  if (!open) return null

  const nonFileFields = formSchema?.fields?.filter(f => f.type !== 'file') ?? []
  const fileFields = formSchema?.fields?.filter(f => f.type === 'file') ?? []

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 900, background: '#F1F5F9', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.3)', position: 'relative' }}>

        {/* Modal chrome top bar */}
        <div style={{ background: '#0F172A', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
          </div>
          <div style={{ flex: 1, background: '#1E293B', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>
            spotlight.rusk.media/apply/{show ? show.toLowerCase().replace(/\s+/g, '-') : 'casting-call'}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'inherit' }}>
            <X style={{ width: 15, height: 15 }} /> Close preview
          </button>
        </div>

        {/* Simulated page */}
        <div style={{ background: '#F1F5F9', minHeight: 400 }}>

          {/* Header */}
          <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
            {bannerUrl ? (
              <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
                <img src={bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(15,23,42,.6))' }} />
                <div style={{ position: 'absolute', bottom: 16, left: 24, right: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Film style={{ width: 13, height: 13, color: 'rgba(255,255,255,.8)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.8)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{show || 'Show Name'}</span>
                  </div>
                  <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: '#fff', margin: 0 }}>{title || 'Casting Call Title'}</h1>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Film style={{ width: 13, height: 13, color: '#3B82F6' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{show || 'Show Name'}</span>
                </div>
                <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: '#0F172A', margin: '0 0 4px' }}>{title || 'Casting Call Title'}</h1>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Role: <strong style={{ color: '#0F172A' }}>{role || 'Role'}</strong></p>
              </div>
            )}
          </div>

          {/* Two-col body */}
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 24, alignItems: 'flex-start' }}>

            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Step progress mock */}
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 0 }}>
                {[
                  { label: 'Verify phone', done: false, active: false },
                  { label: 'Your details', done: false, active: true },
                  { label: 'Media & extras', done: false, active: false },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        background: s.active ? '#0F172A' : '#F1F5F9',
                        color: s.active ? '#fff' : '#94A3B8',
                        border: s.active ? 'none' : '1.5px solid #E2E8F0',
                      }}>{i + 1}</div>
                      <span style={{ fontSize: 12, fontWeight: s.active ? 600 : 400, color: s.active ? '#0F172A' : '#94A3B8', whiteSpace: 'nowrap' }}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: '#E2E8F0', margin: '0 10px' }} />}
                  </div>
                ))}
              </div>

              {/* Details form */}
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: '#0F172A', margin: '0 0 4px' }}>Your details</h2>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Verified as <strong>+91 98765 XXXXX</strong></p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 5 }}>Full Name *</label>
                    <input disabled placeholder="Your full name" style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, color: '#0F172A', background: '#F8FAFC', cursor: 'not-allowed', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 5 }}>Age *</label>
                    <input disabled type="number" placeholder="25" style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, background: '#F8FAFC', cursor: 'not-allowed', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 5 }}>City *</label>
                    <input disabled placeholder="Mumbai" style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, background: '#F8FAFC', cursor: 'not-allowed', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 5 }}>Email <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span></label>
                    <input disabled type="email" placeholder="your@email.com" style={{ width: '100%', padding: '10px 13px', border: '1px solid #E2E8F0', borderRadius: 9, fontSize: 14, background: '#F8FAFC', cursor: 'not-allowed', boxSizing: 'border-box' as const, fontFamily: 'inherit' }} />
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 8 }}>Languages *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {COMMON_LANGUAGES.map(lang => (
                      <button key={lang} type="button" disabled style={{ padding: '7px 13px', fontSize: 13, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A', cursor: 'default', fontFamily: 'inherit' }}>{lang}</button>
                    ))}
                  </div>
                </div>

                {/* Custom non-file fields */}
                {nonFileFields.map(field => <PreviewDynamicField key={field.id} field={field} />)}

                {/* Consent */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                  <label style={{ display: 'flex', gap: 10, cursor: 'default' }}>
                    <input type="checkbox" disabled style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
                      {formSchema?.settings?.consentText || 'I consent to Rusk Media using my submission for casting purposes. I confirm all information provided is accurate.'}
                    </span>
                  </label>
                </div>
              </div>

              <button disabled style={{
                width: '100%', padding: '14px 0', background: '#0F172A', color: '#fff',
                border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 700,
                cursor: 'not-allowed', opacity: 0.8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(15,23,42,.18)', fontFamily: 'inherit',
              }}>
                <ChevronRight style={{ width: 17, height: 17 }} /> Save & Continue to Media
              </button>

              {/* File fields (media step) */}
              {fileFields.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: '#0F172A', margin: '0 0 4px' }}>Upload your media</h2>
                    <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Step 3 — after submitting your details</p>
                  </div>
                  {fileFields.map(field => <PreviewDynamicField key={field.id} field={field} />)}
                </div>
              )}
            </div>

            {/* Right: info card */}
            <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
                {bannerUrl && <img src={bannerUrl} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />}
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <Film style={{ width: 12, height: 12, color: '#3B82F6' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{show || 'Show'}</span>
                    </div>
                    <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 16, color: '#0F172A', margin: '0 0 2px', lineHeight: 1.3 }}>{title || 'Casting Call Title'}</h3>
                    <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Role: <strong style={{ color: '#0F172A' }}>{role || 'Role'}</strong></p>
                  </div>
                  {description && (
                    <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.65, margin: 0, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                      {description.length > 200 ? description.slice(0, 200) + '…' : description}
                    </p>
                  )}
                  {deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFBEB', borderRadius: 8, padding: '7px 10px' }}>
                      <Calendar style={{ width: 12, height: 12, color: '#D97706', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>
                        Deadline: {new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Tips for a strong application</p>
                {['Use a recent, clear headshot with good lighting', 'Record your self-tape in a quiet space', 'Speak clearly and naturally — be yourself', 'Double-check your city and contact details'].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 9 }}>
                    <Star style={{ width: 11, height: 11, color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Collaborators Panel ──────────────────────────────────────────────────────


export default function CastingCallForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [loading, setLoading] = useState<'draft' | 'publish' | 'close' | 'reopen' | null>(null)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null)
  const [bannerUrl, setBannerUrl] = useState('')
  const [status, setStatus] = useState<CastingStatus>('draft')
  const [showPreview, setShowPreview] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [showCollaborate, setShowCollaborate] = useState(false)
  const [liveCallData, setLiveCallData] = useState<CastingCall | null>(null)

  // AI brief state
  const [brief, setBrief] = useState('')
  const [briefFile, setBriefFile] = useState<File | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {},
  })

  useEffect(() => {
    if (!isEdit) return
    castingCallsApi.getById(id!)
      .then((res) => {
        const cc = res.data
        reset({
          title: cc.title,
          show: cc.show,
          role: cc.role,
          description: cc.description ?? '',
          deadline: cc.deadline ? cc.deadline.slice(0, 16) : '',
        })
        setStatus(cc.status as CastingStatus)
        if (cc.form_schema) setFormSchema(cc.form_schema)
        if (cc.banner_url) setBannerUrl(cc.banner_url)
        setCollaborators(cc.collaborators ?? [])
        setLiveCallData(cc)
      })
      .catch(() => errorToast('Failed to load casting call'))
      .finally(() => setLoadingData(false))
  }, [id, isEdit, reset])

  // Core save — called with explicit target status so each button controls its own intent
  const saveWithStatus = async (data: FormData, targetStatus: CastingStatus, actionKey: 'draft' | 'publish' | 'close' | 'reopen') => {
    setLoading(actionKey)
    try {
      const payload = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        status: targetStatus,
        form_schema: formSchema ?? undefined,
        banner_url: bannerUrl || undefined,
      }
      if (isEdit) {
        await castingCallsApi.update(id!, payload)
      } else {
        await castingCallsApi.create(payload)
      }
      const messages: Record<string, string> = {
        draft:   'Draft saved',
        publish: 'Casting call is now live! 🎬',
        close:   'Casting call closed',
        reopen:  'Casting call reopened',
      }
      successToast(messages[actionKey])
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      errorToast(msg || 'Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const handleAiFill = async () => {
    if (!brief.trim() && !briefFile) return
    setAiLoading(true)
    setAiDone(false)
    try {
      const res = await aiApi.fillCastingCall(brief, briefFile ?? undefined)
      const d = res.data
      reset({
        title: d.title,
        show: d.show,
        role: d.role,
        description: d.description,
        deadline: d.deadline,
      })
      setFormSchema(d.form_schema)
      setAiDone(true)
      successToast('Form filled by AI! Review and adjust as needed.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      errorToast(msg || 'AI fill failed. Check your OpenAI API key.')
    } finally {
      setAiLoading(false)
    }
  }

  const watchedValues = watch()

  if (loadingData) {
    return (
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 56, background: 'var(--surface)', borderRadius: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{
        padding: '0 20px 0 24px',
        height: 58,
        background: 'var(--white)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
        >
          <ArrowLeft style={{ width: 15, height: 15, color: 'var(--ink)' }} />
        </button>

        {/* Title + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 16, color: 'var(--navy)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            {isEdit ? (watchedValues.title || 'Edit Casting Call') : 'New Casting Call'}
          </span>
          {/* Status pill */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
            color: STATUS_META[status].color,
            background: STATUS_META[status].bg,
            flexShrink: 0,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_META[status].dot, display: 'inline-block' }} />
            {STATUS_META[status].label}
          </span>
        </div>

        {/* ── Action buttons — contextual by status ── */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>

          {/* Collaborate — only on edit */}
          {isEdit && (
            <button
              type="button"
              onClick={() => setShowCollaborate(true)}
              style={{ padding: '6px 12px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--navy)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              <UserPlus style={{ width: 13, height: 13 }} />
              Collaborate
              {collaborators.length > 0 && (
                <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--blue-lt)', color: 'var(--blue)', borderRadius: 20, padding: '1px 6px', lineHeight: 1.6 }}>
                  {collaborators.length}
                </span>
              )}
            </button>
          )}

          {/* Preview — always visible */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            style={{ padding: '6px 12px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--navy)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <Eye style={{ width: 13, height: 13 }} /> Preview
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

          {/* DRAFT status buttons */}
          {status === 'draft' && (<>
            <button type="button" onClick={() => navigate('/')}
              style={{ padding: '6px 13px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >Discard</button>

            <button type="button" onClick={handleSubmit(d => saveWithStatus(d, 'draft', 'draft'))} disabled={!!loading}
              style={{ padding: '6px 14px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--ink)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >
              {loading === 'draft' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <BookOpen style={{ width: 13, height: 13 }} />}
              {loading === 'draft' ? 'Saving…' : 'Save draft'}
            </button>

            <button type="button" onClick={handleSubmit(d => saveWithStatus(d, 'open', 'publish'))} disabled={!!loading}
              style={{ padding: '6px 16px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {loading === 'publish' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Radio style={{ width: 13, height: 13 }} />}
              {loading === 'publish' ? 'Publishing…' : 'Publish'}
            </button>
          </>)}

          {/* OPEN status buttons */}
          {status === 'open' && (<>
            <button type="button" onClick={() => navigate('/')}
              style={{ padding: '6px 13px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >Cancel</button>

            <button type="button" onClick={handleSubmit(d => saveWithStatus(d, 'closed', 'close'))} disabled={!!loading}
              style={{ padding: '6px 14px', background: 'var(--white)', border: '1px solid #FECACA', color: 'var(--rose)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >
              {loading === 'close' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <XCircle style={{ width: 13, height: 13 }} />}
              {loading === 'close' ? 'Closing…' : 'Close casting'}
            </button>

            <button type="button" onClick={handleSubmit(d => saveWithStatus(d, 'open', 'publish'))} disabled={!!loading}
              style={{ padding: '6px 16px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {loading === 'publish' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 style={{ width: 13, height: 13 }} />}
              {loading === 'publish' ? 'Saving…' : 'Save changes'}
            </button>
          </>)}

          {/* CLOSED status buttons */}
          {status === 'closed' && (<>
            <button type="button" onClick={() => navigate('/')}
              style={{ padding: '6px 13px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >Cancel</button>

            <button type="button" onClick={handleSubmit(d => saveWithStatus(d, 'closed', 'publish'))} disabled={!!loading}
              style={{ padding: '6px 14px', background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--ink)', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
            >
              {loading === 'publish' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 style={{ width: 13, height: 13 }} />}
              {loading === 'publish' ? 'Saving…' : 'Save changes'}
            </button>

            <button type="button" onClick={handleSubmit(d => saveWithStatus(d, 'open', 'reopen'))} disabled={!!loading}
              style={{ padding: '6px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {loading === 'reopen' ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <RotateCcw style={{ width: 13, height: 13 }} />}
              {loading === 'reopen' ? 'Reopening…' : 'Reopen'}
            </button>
          </>)}
        </div>
      </div>

      {/* AI Brief banner */}
      <AiBriefPanel
        brief={brief}
        setBrief={setBrief}
        briefFile={briefFile}
        setBriefFile={setBriefFile}
        onGenerate={handleAiFill}
        loading={aiLoading}
        done={aiDone}
        setDone={setAiDone}
      />

      {/* Two-column body */}
      <form
        id="casting-call-form"
        onSubmit={e => e.preventDefault()}
        style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }}
      >
        {/* Left — casting call details */}
        <div style={{ overflowY: 'auto', padding: '24px 20px 24px 28px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Casting call details</p>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Title *</label>
                <StyledInput {...register('title')} type="text" placeholder="Lead Actor – Drama Series" />
                {errors.title && <p style={{ fontSize: 11.5, color: 'var(--rose)', marginTop: 3 }}>{errors.title.message}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Show / Project *</label>
                  <StyledInput {...register('show')} type="text" placeholder="Mumbai Stories S2" />
                  {errors.show && <p style={{ fontSize: 11.5, color: 'var(--rose)', marginTop: 3 }}>{errors.show.message}</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Role *</label>
                  <StyledInput {...register('role')} type="text" placeholder="Male Lead" />
                  {errors.role && <p style={{ fontSize: 11.5, color: 'var(--rose)', marginTop: 3 }}>{errors.role.message}</p>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>Description *</label>
                <StyledTextarea {...register('description')} rows={4} placeholder="Describe the role, character, requirements..." />
                {errors.description && <p style={{ fontSize: 11.5, color: 'var(--rose)', marginTop: 3 }}>{errors.description.message}</p>}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Banner image</p>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <BannerCropper value={bannerUrl} onChange={setBannerUrl} />
            </div>
          </div>

          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Scheduling</p>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>
                Application deadline
                <span style={{ fontWeight: 400, color: 'var(--faint)', marginLeft: 6 }}>(optional)</span>
              </label>
              <StyledInput {...register('deadline')} type="datetime-local" />
              {errors.deadline && <p style={{ fontSize: 11.5, color: 'var(--rose)', marginTop: 3 }}>{errors.deadline.message}</p>}
              <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 7, lineHeight: 1.5 }}>
                Use the <strong>Publish</strong> button above to make this casting call live, or <strong>Save draft</strong> to keep it private.
              </p>
            </div>
          </div>

        </div>

        {/* Right — form builder */}
        <div style={{ overflowY: 'auto', padding: '24px 28px 24px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Application form</p>
              <p style={{ fontSize: 12, color: 'var(--faint)', margin: 0, lineHeight: 1.5 }}>
                Name, phone, age, city & languages are always collected. Add custom fields below.
              </p>
            </div>
            <div style={{ padding: '16px 18px', flex: 1 }}>
              <FormBuilder key={formSchema?.fields?.map(f => f.id).join(',') || 'empty'} value={formSchema} onChange={setFormSchema} />
            </div>
          </div>
        </div>
      </form>

      {/* Collaborate dialog */}
      {showCollaborate && liveCallData && (
        <CollaborateDialog
          castingCall={{ ...liveCallData, collaborators }}
          onClose={() => setShowCollaborate(false)}
        />
      )}

      {/* Preview modal — reads live form values + current schema/banner */}
      <FormPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={watchedValues.title || ''}
        show={watchedValues.show || ''}
        role={watchedValues.role || ''}
        description={watchedValues.description || ''}
        deadline={watchedValues.deadline || ''}
        bannerUrl={bannerUrl}
        formSchema={formSchema}
      />
    </div>
  )
}
