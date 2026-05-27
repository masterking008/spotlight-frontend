import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Send, Save, GripVertical, X, ChevronDown, ChevronUp,
  User, Phone, MapPin, Languages, Video, Plus,
  CheckCircle2, Loader2, FileText, Eye,
} from 'lucide-react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { applicationsApi, pitchDecksApi, castingCallsApi } from '../lib/api'
import type { Application, PitchDeck } from '../lib/api'
import { successToast, errorToast, confirmDialog } from '../lib/swal'

// ─── Sortable finalist card ─────────────────────────────────────────────────

interface FinalistCardProps {
  app: Application
  position: number
  managerNotes: string
  onNotesChange: (notes: string) => void
  onRemove: () => void
}

function FinalistCard({ app, position, managerNotes, onNotesChange, onRemove }: FinalistCardProps) {
  const { applicant, media = [], tags = [] } = app
  const photo = media.find(m => m.type === 'photo' && m.url)
  const hasVideo = media.some(m => m.type === 'video' && m.url)
  const [expanded, setExpanded] = useState(false)
  const [notesFocused, setNotesFocused] = useState(false)

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: app.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--white)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{
            padding: 4,
            color: 'var(--faint)',
            background: 'none',
            border: 'none',
            cursor: 'grab',
            display: 'flex',
            touchAction: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--faint)')}
        >
          <GripVertical style={{ width: 18, height: 18 }} />
        </button>

        {/* Position badge */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--navy)', color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {position}
        </div>

        {/* Photo */}
        <div style={{
          width: 46, height: 46, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          background: 'var(--blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {photo?.url ? (
            <img src={photo.url} alt={applicant?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--blue)' }}>{applicant?.name?.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{applicant?.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {applicant?.city && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <MapPin style={{ width: 10, height: 10 }} />{applicant.city}
              </span>
            )}
            {applicant?.age && (
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>{applicant.age} yrs</span>
            )}
            {hasVideo && (
              <span style={{
                fontSize: 10.5, background: 'var(--purple-lt)', color: 'var(--purple)',
                padding: '1px 6px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Video style={{ width: 10, height: 10 }} />tape
              </span>
            )}
          </div>
        </div>

        {/* Expand + Remove */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: 6, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--faint)', borderRadius: 6, display: 'flex',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {expanded ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}
        </button>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: 6, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--faint)', borderRadius: 6, display: 'flex',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-lt)'; e.currentTarget.style.color = 'var(--rose)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--faint)' }}
        >
          <X style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Contact */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {applicant?.phone && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone style={{ width: 10, height: 10 }} />{applicant.phone}
              </span>
            )}
            {applicant?.languages && applicant.languages.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Languages style={{ width: 10, height: 10 }} />{applicant.languages.join(', ')}
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tags.map(t => (
                <span key={t.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 5, fontSize: 10.5, color: 'var(--muted)', padding: '2px 7px',
                }}>{t.tag_name}</span>
              ))}
            </div>
          )}

          {/* Photos row */}
          {media.filter(m => m.type === 'photo' && m.url).length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {media.filter(m => m.type === 'photo' && m.url).map(p => (
                <img key={p.id} src={p.url!} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ))}
            </div>
          )}

          {/* Manager notes for this finalist */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>Your notes on this talent</label>
            <textarea
              value={managerNotes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Why this person is a great fit..."
              rows={2}
              style={{
                width: '100%',
                background: 'var(--white)',
                border: `1px solid ${notesFocused ? '#93C5FD' : 'var(--border)'}`,
                boxShadow: notesFocused ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
                borderRadius: 8,
                padding: '7px 11px',
                fontSize: 13,
                fontFamily: 'inherit',
                color: 'var(--ink)',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={() => setNotesFocused(true)}
              onBlur={() => setNotesFocused(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Applicant picker ────────────────────────────────────────────────────────

interface PickerProps {
  castingCallId: number
  selectedIds: number[]
  onSelect: (app: Application) => void
}

function ApplicantPicker({ castingCallId, selectedIds, onSelect }: PickerProps) {
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const { data } = useQuery({
    queryKey: ['applications', castingCallId, 'shortlisted'],
    queryFn: async () => {
      const res = await applicationsApi.getByCastingCall(castingCallId, {
        status: 'shortlisted',
      })
      return res.data as Application[]
    },
  })

  const filtered = (data || []).filter(a =>
    !selectedIds.includes(a.id) &&
    (!search || a.applicant?.name?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: 18 }}>
      <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--faint)', marginBottom: 12, margin: '0 0 12px' }}>
        Add shortlisted talent ({filtered.length} available)
      </p>
      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--white)',
          border: `1px solid ${searchFocused ? '#93C5FD' : 'var(--border)'}`,
          boxShadow: searchFocused ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 13,
          fontFamily: 'inherit',
          color: 'var(--ink)',
          outline: 'none',
          marginBottom: 10,
          boxSizing: 'border-box',
        }}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '16px 0' }}>
            {data?.length === 0
              ? 'No shortlisted applicants yet. Mark some as "Shortlisted" first.'
              : 'No matches'}
          </p>
        )}
        {filtered.map(app => {
          const photo = app.media?.find(m => m.type === 'photo' && m.url)
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelect(app)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                background: 'none',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'var(--blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {photo?.url ? (
                  <img src={photo.url} alt={app.applicant?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 13 }}>{app.applicant?.name?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{app.applicant?.name}</p>
                <p style={{ fontSize: 11, color: 'var(--faint)', margin: 0 }}>
                  {app.applicant?.city}{app.applicant?.age ? `, ${app.applicant.age} yrs` : ''}
                </p>
              </div>
              <Plus style={{ width: 14, height: 14, color: 'var(--faint)', flexShrink: 0 }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PitchDeckBuilder() {
  const { id: castingCallIdStr, deckId } = useParams<{ id: string; deckId?: string }>()
  const castingCallId = Number(castingCallIdStr)
  const isEdit = !!deckId
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [finalists, setFinalists] = useState<Array<{ app: Application; managerNotes: string }>>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [titleFocused, setTitleFocused] = useState(false)
  const [notesFocused, setNotesFocused] = useState(false)

  const { data: castingCall } = useQuery({
    queryKey: ['casting-call', castingCallId],
    queryFn: () => castingCallsApi.getById(castingCallId).then(r => r.data),
  })

  // Load existing deck if editing
  const { data: existingDeck } = useQuery({
    queryKey: ['pitch-deck', deckId],
    queryFn: () => pitchDecksApi.getById(Number(deckId)).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!existingDeck) return
    setTitle(existingDeck.title)
    setNotes(existingDeck.notes || '')
    if (existingDeck.finalists) {
      const sorted = [...existingDeck.finalists].sort((a, b) => a.position - b.position)
      setFinalists(sorted.map(f => ({
        app: f.application!,
        managerNotes: f.manager_notes || '',
      })))
    }
  }, [existingDeck])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = finalists.findIndex(f => f.app.id === active.id)
      const newIdx = finalists.findIndex(f => f.app.id === over.id)
      setFinalists(arrayMove(finalists, oldIdx, newIdx))
    }
  }

  const addFinalist = (app: Application) => {
    if (finalists.length >= 10) {
      errorToast('Maximum 10 finalists per pitch deck')
      return
    }
    setFinalists(prev => [...prev, { app, managerNotes: '' }])
  }

  const removeFinalist = (appId: number) => {
    setFinalists(prev => prev.filter(f => f.app.id !== appId))
  }

  const updateNotes = (appId: number, notes: string) => {
    setFinalists(prev => prev.map(f => f.app.id === appId ? { ...f, managerNotes: notes } : f))
  }

  const handleSave = useCallback(async (andSubmit = false) => {
    if (!title.trim()) { errorToast('Please add a deck title'); return }
    if (finalists.length < 3) { errorToast('Add at least 3 finalists before saving'); return }

    if (andSubmit) {
      const ok = await confirmDialog({
        title: 'Submit for approval?',
        text: 'The deck will be sent to the approver. You won\'t be able to edit it after submission.',
        confirmText: 'Yes, submit',
        icon: 'question',
      })
      if (!ok) return
    }

    setSaving(true)
    try {
      const payload = {
        casting_call_id: castingCallId,
        title: title.trim(),
        notes: notes.trim() || undefined,
        finalists: finalists.map((f, i) => ({
          application_id: f.app.id,
          position: i + 1,
          manager_notes: f.managerNotes || undefined,
        })),
      }

      let deck: PitchDeck
      if (isEdit) {
        const res = await pitchDecksApi.update(Number(deckId), payload)
        deck = res.data
      } else {
        const res = await pitchDecksApi.create(payload)
        deck = res.data
      }

      if (andSubmit) {
        await pitchDecksApi.submit(deck.id)
        successToast('Pitch deck submitted for approval!')
      } else {
        successToast('Draft saved!')
      }

      qc.invalidateQueries({ queryKey: ['pitch-decks', castingCallId] })
      setSaved(true)
      setTimeout(() => navigate(`/casting-calls/${castingCallId}/applications`), 900)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      errorToast(msg || 'Failed to save pitch deck')
    } finally {
      setSaving(false)
    }
  }, [title, notes, finalists, castingCallId, deckId, isEdit, navigate, qc])

  const isSubmitted = existingDeck?.status === 'submitted' || existingDeck?.status === 'approved'
  const readOnly = isSubmitted

  return (
    <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto" style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => navigate(`/casting-calls/${castingCallId}/applications`)}
            style={{
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
          >
            <ArrowLeft style={{ width: 18, height: 18, color: 'var(--ink)' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isEdit ? 'Edit Pitch Deck' : 'New Pitch Deck'}
            </h1>
            {castingCall && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, margin: '5px 0 0' }}>
                {castingCall.title} · {castingCall.show}
              </p>
            )}
          </div>
          {isSubmitted && (
            <span style={{
              padding: '5px 12px',
              background: 'var(--green-lt)', color: 'var(--green)',
              border: '1px solid #A7F3D0',
              borderRadius: 8, fontSize: 12.5, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              Submitted
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 20 }}>

          {/* Left: deck details + finalists */}
          <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Deck meta */}
            <section style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ width: 14, height: 14, color: 'var(--faint)' }} />
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', margin: 0 }}>Deck details</h2>
              </div>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={readOnly}
                    placeholder="e.g. Top 5 Finalists – Lead Role"
                    style={{
                      width: '100%', background: readOnly ? 'var(--surface)' : 'var(--white)',
                      border: `1px solid ${titleFocused ? '#93C5FD' : 'var(--border)'}`,
                      boxShadow: titleFocused ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
                      borderRadius: 8, padding: '8px 12px', fontSize: 13,
                      fontFamily: 'inherit', color: readOnly ? 'var(--muted)' : 'var(--ink)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={() => setTitleFocused(true)}
                    onBlur={() => setTitleFocused(false)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>Notes for approver</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={readOnly}
                    placeholder="Overall selection rationale, any special considerations..."
                    rows={3}
                    style={{
                      width: '100%', background: readOnly ? 'var(--surface)' : 'var(--white)',
                      border: `1px solid ${notesFocused ? '#93C5FD' : 'var(--border)'}`,
                      boxShadow: notesFocused ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
                      borderRadius: 8, padding: '8px 12px', fontSize: 13,
                      fontFamily: 'inherit', color: readOnly ? 'var(--muted)' : 'var(--ink)',
                      outline: 'none', resize: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={() => setNotesFocused(true)}
                    onBlur={() => setNotesFocused(false)}
                  />
                </div>
              </div>
            </section>

            {/* Finalists list */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', margin: 0 }}>
                  Finalists
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--faint)' }}>
                    {finalists.length}/10 · min 3
                  </span>
                </h2>
              </div>

              {finalists.length === 0 && (
                <div style={{
                  background: 'var(--white)', borderRadius: 12,
                  border: '1px dashed var(--border-2)',
                  padding: 40, textAlign: 'center',
                }}>
                  <User style={{ width: 36, height: 36, color: 'var(--border-2)', margin: '0 auto 10px' }} />
                  <p style={{ color: 'var(--faint)', fontSize: 13, margin: '0 0 4px' }}>No finalists yet</p>
                  <p style={{ color: 'var(--border-2)', fontSize: 11.5, margin: 0 }}>Add shortlisted talent from the panel on the right</p>
                </div>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={finalists.map(f => f.app.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {finalists.map((f, idx) => (
                    <FinalistCard
                      key={f.app.id}
                      app={f.app}
                      position={idx + 1}
                      managerNotes={f.managerNotes}
                      onNotesChange={n => updateNotes(f.app.id, n)}
                      onRemove={() => removeFinalist(f.app.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </section>

            {/* Actions */}
            {!readOnly && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 28 }}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={{
                    padding: '8px 18px', background: 'var(--white)',
                    border: '1px solid var(--border)', color: 'var(--ink)',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving || saved}
                  style={{
                    padding: '8px 18px', background: 'var(--white)',
                    border: '1px solid var(--border)', color: 'var(--ink)',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                    cursor: saving || saved ? 'not-allowed' : 'pointer',
                    opacity: saving || saved ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 7,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                >
                  {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving || saved}
                  style={{
                    padding: '8px 20px', background: 'var(--navy)',
                    color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                    border: 'none',
                    cursor: saving || saved ? 'not-allowed' : 'pointer',
                    opacity: saving || saved ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 7,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.background = 'var(--navy-2)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
                >
                  {saved ? (
                    <><CheckCircle2 style={{ width: 14, height: 14 }} /> Submitted!</>
                  ) : saving ? (
                    <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><Send style={{ width: 14, height: 14 }} /> Submit for approval</>
                  )}
                </button>
              </div>
            )}

            {readOnly && (
              <div style={{ paddingBottom: 28 }}>
                <button
                  type="button"
                  onClick={() => navigate(`/pitch-decks/${deckId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 13, color: 'var(--blue)', background: 'none',
                    border: 'none', cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <Eye style={{ width: 14, height: 14 }} />
                  View approval status
                </button>
              </div>
            )}
          </div>

          {/* Right: applicant picker */}
          {!readOnly && (
            <div className="lg:col-span-1">
              <div style={{ position: 'sticky', top: 24 }}>
                <ApplicantPicker
                  castingCallId={castingCallId}
                  selectedIds={finalists.map(f => f.app.id)}
                  onSelect={addFinalist}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
