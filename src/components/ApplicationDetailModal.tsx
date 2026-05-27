import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import {
  X, Plus, ChevronLeft, ChevronRight, Save,
  Phone, Mail, Languages, Calendar, Hash,
  CheckCircle2, XCircle, Clock, Star, Play,
} from 'lucide-react'
import { applicationsApi, castingCallsApi } from '../lib/api'
import type { Application, ApplicationTag, ApplicationMedia } from '../lib/api'
import { successToast, errorToast } from '../lib/swal'
import { PRESET_TAGS } from '../lib/utils'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  new:         { label: 'New',         bg: '#EFF6FF', color: '#1D4ED8', icon: <Clock className="w-3 h-3" /> },
  reviewing:   { label: 'Reviewing',   bg: '#FFFBEB', color: '#B45309', icon: <Star className="w-3 h-3" /> },
  shortlisted: { label: 'Shortlisted', bg: '#F5F3FF', color: '#6D28D9', icon: <CheckCircle2 className="w-3 h-3" /> },
  pitched:     { label: 'Pitched',     bg: '#FFF7ED', color: '#C2410C', icon: <ChevronRight className="w-3 h-3" /> },
  approved:    { label: 'Approved',    bg: '#ECFDF5', color: '#065F46', icon: <CheckCircle2 className="w-3 h-3" /> },
  cast:        { label: 'Cast',        bg: '#ECFDF5', color: '#065F46', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:    { label: 'Rejected',    bg: '#FEF2F2', color: '#B91C1C', icon: <XCircle className="w-3 h-3" /> },
}
const STATUS_ORDER = ['new', 'reviewing', 'shortlisted', 'pitched', 'approved', 'cast', 'rejected']

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  application: Application | null
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ApplicationDetailModal({ application, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  const qc = useQueryClient()
  const [mediaIndex, setMediaIndex] = useState(0)
  const [notes, setNotes] = useState(application?.notes || '')
  const [notesDirty, setNotesDirty] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset on application change
  useEffect(() => {
    setMediaIndex(0)
    setNotes(application?.notes || '')
    setNotesDirty(false)
    scrollRef.current?.scrollTo(0, 0)
  }, [application?.id])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && e.altKey && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && e.altKey && hasNext) onNext?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  // Live single-application query — this is what the modal renders from.
  // Mutations invalidate this key so the modal updates instantly.
  const { data: liveApp } = useQuery({
    queryKey: ['application', application?.id],
    queryFn: () => applicationsApi.getById(application!.id).then(r => r.data),
    enabled: !!application?.id,
    staleTime: 0,
    placeholderData: application ?? undefined,
  })
  // Use live data if available, fall back to prop
  const app = liveApp ?? application

  // Fetch casting call for form_schema (to get question labels)
  const { data: castingCall } = useQuery({
    queryKey: ['casting-call', application?.casting_call_id],
    queryFn: () => castingCallsApi.getById(application!.casting_call_id).then(r => r.data),
    enabled: !!application?.casting_call_id,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch fresh media with current signed read URLs.
  const { data: freshMedia } = useQuery({
    queryKey: ['application-media', application?.id],
    queryFn: () => applicationsApi.getMedia(application!.id).then(r => r.data),
    enabled: !!application?.id,
    staleTime: 50 * 60 * 1000,
  })

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['application', application?.id] })
    qc.invalidateQueries({ queryKey: ['applications-all'] })
  }, [qc, application?.id])

  const statusMutation = useMutation({
    mutationFn: (status: string) => applicationsApi.updateStatus(application!.id, status),
    onSuccess: (_d, s) => { invalidate(); successToast(`Status → ${STATUS_CONFIG[s]?.label ?? s}`) },
    onError: () => errorToast('Failed to update status'),
  })

  const notesMutation = useMutation({
    mutationFn: (n: string) => applicationsApi.updateNotes(application!.id, n),
    onSuccess: () => { setNotesDirty(false); invalidate(); successToast('Notes saved') },
    onError: () => errorToast('Failed to save notes'),
  })

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => applicationsApi.addTag(application!.id, tag),
    onSuccess: (_d, tag) => { setNewTag(''); setAddingTag(false); invalidate(); successToast(`Tag "${tag}" added`) },
    onError: () => errorToast('Failed to add tag'),
  })

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => applicationsApi.removeTag(application!.id, tag),
    onSuccess: invalidate,
    onError: () => errorToast('Failed to remove tag'),
  })

  const saveNotes = useCallback(() => {
    if (notesDirty) notesMutation.mutate(notes)
  }, [notes, notesDirty, notesMutation])

  if (!app) return null

  const { applicant, tags = [], media: listMedia = [], custom_responses } = app
  // Prefer freshly-fetched media (with current signed URLs) over the list snapshot
  const allMedia: ApplicationMedia[] = (freshMedia ?? listMedia).filter(m => m.url)
  const currentMedia = allMedia[mediaIndex] ?? null

  // Build question label map from form_schema
  const fieldLabelMap: Record<string, string> = {}
  if (castingCall?.form_schema?.fields) {
    for (const field of castingCall.form_schema.fields) {
      fieldLabelMap[field.id] = field.label
    }
  }

  const responsePairs = custom_responses
    ? Object.entries(custom_responses).filter(([, val]) => val !== null && val !== undefined && val !== '')
    : []

  const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.new

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        style={{
          width: '100%', maxWidth: 980, height: '92vh', maxHeight: 740,
          background: '#fff', borderRadius: 16,
          display: 'flex', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── LEFT: Media panel ─────────────────────────────────────────── */}
        <div style={{
          width: '52%', flexShrink: 0,
          background: '#0a0a0a',
          display: 'flex', flexDirection: 'column',
          position: 'relative',
          borderRadius: '16px 0 0 16px',
          overflow: 'hidden',
        }}>

          {/* Main media area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {allMedia.length === 0 ? (
              /* No media placeholder */
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 12, color: '#555',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, color: '#666',
                }}>
                  {applicant?.name?.charAt(0).toUpperCase()}
                </div>
                <p style={{ fontSize: 13, color: '#555', margin: 0 }}>No media uploaded</p>
              </div>
            ) : currentMedia?.type === 'video' ? (
              <video
                key={currentMedia.url}
                src={currentMedia.url!}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <img
                key={currentMedia?.url}
                src={currentMedia?.url!}
                alt="Applicant"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}

            {/* Arrow buttons — only when >1 media */}
            {allMedia.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setMediaIndex(i => Math.max(0, i - 1))}
                  disabled={mediaIndex === 0}
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: '50%',
                    background: mediaIndex === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
                    border: 'none', cursor: mediaIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: mediaIndex === 0 ? 0.35 : 1,
                    backdropFilter: 'blur(4px)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (mediaIndex > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { if (mediaIndex > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                >
                  <ChevronLeft style={{ width: 18, height: 18, color: '#fff' }} />
                </button>
                <button
                  type="button"
                  onClick={() => setMediaIndex(i => Math.min(allMedia.length - 1, i + 1))}
                  disabled={mediaIndex === allMedia.length - 1}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: '50%',
                    background: mediaIndex === allMedia.length - 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
                    border: 'none', cursor: mediaIndex === allMedia.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: mediaIndex === allMedia.length - 1 ? 0.35 : 1,
                    backdropFilter: 'blur(4px)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (mediaIndex < allMedia.length - 1) e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={e => { if (mediaIndex < allMedia.length - 1) e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                >
                  <ChevronRight style={{ width: 18, height: 18, color: '#fff' }} />
                </button>
              </>
            )}

            {/* Index dot indicator */}
            {allMedia.length > 1 && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 5,
              }}>
                {allMedia.map((_, i) => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i === mediaIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                    transition: 'background 0.15s',
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {allMedia.length > 1 && (
            <div style={{
              display: 'flex', gap: 4, padding: '8px 10px',
              overflowX: 'auto', background: '#111',
              scrollbarWidth: 'none',
            }}>
              {allMedia.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMediaIndex(i)}
                  style={{
                    width: 52, height: 52, flexShrink: 0,
                    borderRadius: 8, overflow: 'hidden',
                    border: i === mediaIndex ? '2px solid #fff' : '2px solid transparent',
                    cursor: 'pointer', background: '#1a1a1a',
                    position: 'relative',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {m.type === 'video' ? (
                    <>
                      {m.thumbnail_url
                        ? <img src={m.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play style={{ width: 16, height: 16, color: '#888' }} />
                          </div>
                      }
                      <div style={{
                        position: 'absolute', bottom: 3, right: 3,
                        background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 3px',
                      }}>
                        <Play style={{ width: 8, height: 8, color: '#fff' }} />
                      </div>
                    </>
                  ) : (
                    <img src={m.url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info panel ──────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflowY: 'auto', background: '#fff',
          }}
        >
          {/* Header: close btn */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '20px 20px 0',
            position: 'sticky', top: 0, background: '#fff', zIndex: 1,
            borderBottom: '1px solid #F3F4F6',
            paddingBottom: 14,
          }}>
            {/* Name / age / city */}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                {applicant?.name}
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                {applicant?.age && <span>{applicant.age} yrs</span>}
                {applicant?.age && applicant?.city && <span style={{ color: '#D1D5DB' }}>·</span>}
                {applicant?.city && <span>{applicant.city}</span>}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 7, background: 'transparent', border: 'none', cursor: 'pointer',
                borderRadius: 10, color: '#9CA3AF', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <div style={{ padding: '0 20px', flex: 1 }}>

            {/* ── Status ── */}
            <Section label="Status">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUS_ORDER.map(s => {
                  const cfg = STATUS_CONFIG[s]
                  const active = app.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => statusMutation.mutate(s)}
                      disabled={statusMutation.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 500,
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        ...(active
                          ? { background: cfg.bg, color: cfg.color, outline: `2px solid ${cfg.color}`, outlineOffset: 1 }
                          : { background: '#F3F4F6', color: '#6B7280' }),
                      }}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* ── Tags ── */}
            <Section label="Tags">
              {/* Preset quick-tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {PRESET_TAGS.map(t => {
                  const active = tags.some((tag: ApplicationTag) => tag.tag_name === t.name)
                  return (
                    <button
                      key={t.name}
                      type="button"
                      disabled={addTagMutation.isPending || removeTagMutation.isPending}
                      onClick={() => active ? removeTagMutation.mutate(t.name) : addTagMutation.mutate(t.name)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: active ? t.bg : '#F9FAFB',
                        color: active ? t.color : '#6B7280',
                        border: `1.5px solid ${active ? t.color + '60' : '#E5E7EB'}`,
                        transform: active ? 'scale(1.04)' : 'scale(1)',
                        opacity: (addTagMutation.isPending || removeTagMutation.isPending) ? 0.6 : 1,
                      }}
                    >
                      <span>{t.emoji}</span> {t.name}
                    </button>
                  )
                })}
              </div>

              {/* Applied tags with remove */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.filter((tag: ApplicationTag) => !PRESET_TAGS.some(p => p.name === tag.tag_name)).map((tag: ApplicationTag) => (
                  <span
                    key={tag.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', background: '#F3F4F6', borderRadius: 20,
                      fontSize: 12, color: '#374151', fontWeight: 500,
                    }}
                  >
                    {tag.tag_name}
                    <button
                      type="button"
                      onClick={() => removeTagMutation.mutate(tag.tag_name)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#9CA3AF', display: 'flex' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </span>
                ))}

                {addingTag ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (newTag.trim()) addTagMutation.mutate(newTag.trim().toLowerCase())
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="tag name"
                      onKeyDown={(e) => e.key === 'Escape' && setAddingTag(false)}
                      style={{
                        width: 90, padding: '3px 8px', fontSize: 12,
                        border: '1px solid #93C5FD', borderRadius: 20,
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', display: 'flex' }}>
                      <CheckCircle2 style={{ width: 16, height: 16 }} />
                    </button>
                    <button type="button" onClick={() => setAddingTag(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12,
                      border: '1.5px dashed #D1D5DB', background: 'none', cursor: 'pointer', color: '#9CA3AF',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#93C5FD'; e.currentTarget.style.color = '#2563EB' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#9CA3AF' }}
                  >
                    <Plus style={{ width: 11, height: 11 }} />
                    Add tag
                  </button>
                )}
              </div>
            </Section>

            {/* ── Custom responses ── */}
            {responsePairs.length > 0 && (
              <Section label="Responses">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {responsePairs.map(([key, val]) => {
                    const label = fieldLabelMap[key] || key.replace(/_/g, ' ')
                    return (
                      <div key={key}>
                        <p style={{ fontSize: 11.5, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 3px' }}>
                          {label}
                        </p>
                        <p style={{ fontSize: 13.5, color: '#1F2937', margin: 0, lineHeight: 1.5 }}>
                          {Array.isArray(val) ? val.join(', ') : String(val)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {/* ── Other details ── */}
            <Section label="Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {applicant?.phone && (
                  <DetailRow icon={<Phone style={{ width: 14, height: 14 }} />} text={applicant.phone} />
                )}
                {applicant?.email && (
                  <DetailRow icon={<Mail style={{ width: 14, height: 14 }} />} text={applicant.email} />
                )}
                {applicant?.languages && applicant.languages.length > 0 && (
                  <DetailRow icon={<Languages style={{ width: 14, height: 14 }} />} text={applicant.languages.join(', ')} />
                )}
                <DetailRow
                  icon={<Calendar style={{ width: 14, height: 14 }} />}
                  text={`Applied ${new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                />
                <DetailRow
                  icon={<Hash style={{ width: 14, height: 14 }} />}
                  text={app.tracking_id}
                  mono
                />
              </div>
            </Section>

            {/* ── Notes ── */}
            <Section label="Reviewer notes" last>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true) }}
                  onBlur={saveNotes}
                  placeholder="Internal notes visible only to the casting team..."
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: 13,
                    border: '1px solid #E5E7EB', borderRadius: 10,
                    resize: 'none', outline: 'none', fontFamily: 'inherit',
                    color: '#374151', lineHeight: 1.5, boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#93C5FD')}
                />
                {notesDirty && (
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={notesMutation.isPending}
                    style={{
                      position: 'absolute', bottom: 10, right: 10,
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', background: '#2563EB', color: '#fff',
                      border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Save style={{ width: 11, height: 11 }} />
                    {notesMutation.isPending ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* Application prev/next nav (Alt+← / Alt+→) */}
        {(hasPrev || hasNext) && (
          <>
            {hasPrev && (
              <button
                type="button"
                onClick={onPrev}
                title="Previous applicant (Alt+←)"
                style={{
                  position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <ChevronLeft style={{ width: 18, height: 18, color: '#fff' }} />
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={onNext}
                title="Next applicant (Alt+→)"
                style={{
                  position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                <ChevronRight style={{ width: 18, height: 18, color: '#fff' }} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function DetailRow({ icon, text, mono }: { icon: React.ReactNode; text: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 13 }}>
      <span style={{ color: '#D1D5DB', flexShrink: 0 }}>{icon}</span>
      <span style={mono ? { fontFamily: 'monospace', fontSize: 12 } : {}}>{text}</span>
    </div>
  )
}
