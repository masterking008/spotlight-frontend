import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Send,
  MapPin, Languages, Phone, RefreshCw, Loader2,
  ChevronDown, ChevronUp, Eye,
} from 'lucide-react'
import { pitchDecksApi } from '../lib/api'
import type { PitchDeckFinalist } from '../lib/api'
import { useRole } from '../hooks/useRole'
import { InlineVideoPlayer } from '../components/InlineVideoPlayer'
import { successToast, errorToast, confirmDialog } from '../lib/swal'

const STATUS_CONFIG = {
  draft:             { label: 'Draft',             color: 'var(--muted)',  bg: 'var(--surface)',   icon: <Clock style={{ width: 13, height: 13 }} /> },
  submitted:         { label: 'Pending review',    color: 'var(--amber)',  bg: 'var(--amber-lt)',  icon: <Clock style={{ width: 13, height: 13 }} /> },
  approved:          { label: 'Approved',          color: 'var(--green)',  bg: 'var(--green-lt)',  icon: <CheckCircle2 style={{ width: 13, height: 13 }} /> },
  rejected:          { label: 'Rejected',          color: 'var(--rose)',   bg: 'var(--rose-lt)',   icon: <XCircle style={{ width: 13, height: 13 }} /> },
  changes_requested: { label: 'Changes requested', color: 'var(--amber)',  bg: 'var(--amber-lt)',  icon: <RefreshCw style={{ width: 13, height: 13 }} /> },
}

const VERDICT_CONFIG = {
  approved: { label: 'Approved',     color: 'var(--green)', bg: 'var(--green-lt)', border: '#A7F3D0', icon: <CheckCircle2 style={{ width: 13, height: 13 }} /> },
  rejected: { label: 'Not selected', color: 'var(--rose)',  bg: 'var(--rose-lt)',  border: '#FECACA', icon: <XCircle style={{ width: 13, height: 13 }} /> },
  pending:  { label: 'Pending',      color: 'var(--muted)', bg: 'var(--surface)',  border: 'var(--border)', icon: <Clock style={{ width: 13, height: 13 }} /> },
}

// ─── Finalist card ───────────────────────────────────────────────────────────

interface FinalistCardProps {
  finalist: PitchDeckFinalist
  canVerdict: boolean
  onVerdictChange: (verdict: 'approved' | 'rejected', notes: string) => void
}

function FinalistViewCard({ finalist, canVerdict, onVerdictChange }: FinalistCardProps) {
  const { application, position, manager_notes, approver_verdict, approver_notes } = finalist
  const { applicant, media = [], tags = [] } = application || {}
  const photo = media.find(m => m.type === 'photo' && m.url)
  const videos = media.filter(m => m.type === 'video' && m.url)
  const [expanded, setExpanded] = useState(false)
  const [verdictNotes, setVerdictNotes] = useState(approver_notes || '')
  const [verdictNotesFocused, setVerdictNotesFocused] = useState(false)
  const [showVerdictForm, setShowVerdictForm] = useState(false)
  const [pendingVerdict, setPendingVerdict] = useState<'approved' | 'rejected' | null>(null)

  const currentVerdict = approver_verdict || 'pending'
  const vCfg = VERDICT_CONFIG[currentVerdict as keyof typeof VERDICT_CONFIG]

  const handleSubmitVerdict = () => {
    if (!pendingVerdict) return
    onVerdictChange(pendingVerdict, verdictNotes)
    setShowVerdictForm(false)
  }

  return (
    <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
        {/* Position */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--navy)', color: '#fff',
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
            {applicant?.age && <span style={{ fontSize: 11, color: 'var(--faint)' }}>{applicant.age} yrs</span>}
          </div>
        </div>

        {/* Verdict badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 8,
          border: `1px solid ${vCfg.border}`,
          background: vCfg.bg, color: vCfg.color,
          fontSize: 11.5, fontWeight: 500,
        }}>
          {vCfg.icon}{vCfg.label}
        </span>

        {/* Expand */}
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
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          {(tags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(tags || []).map(t => (
                <span key={t.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 5, fontSize: 10.5, color: 'var(--muted)', padding: '2px 7px',
                }}>{t.tag_name}</span>
              ))}
            </div>
          )}

          {/* Photos */}
          {media.filter(m => m.type === 'photo' && m.url).length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {media.filter(m => m.type === 'photo' && m.url).map(p => (
                <img key={p.id} src={p.url!} alt="" style={{ width: 76, height: 76, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ))}
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {videos.map(v => (
                <InlineVideoPlayer key={v.id} src={v.url!} applicantName={applicant?.name} />
              ))}
            </div>
          )}

          {/* Manager's notes on this person */}
          {manager_notes && (
            <div style={{ background: 'var(--blue-lt)', borderRadius: 8, padding: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 4, margin: '0 0 4px' }}>Manager's notes</p>
              <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0 }}>{manager_notes}</p>
            </div>
          )}

          {/* Approver verdict section */}
          {canVerdict && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--faint)', margin: 0 }}>Your verdict</p>

              {!showVerdictForm ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setPendingVerdict('approved'); setShowVerdictForm(true) }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      ...(currentVerdict === 'approved'
                        ? { background: 'var(--green)', color: '#fff', border: '1px solid var(--green)' }
                        : { background: 'var(--white)', color: 'var(--ink)', border: '1px solid var(--border)' }),
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (currentVerdict !== 'approved') { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)' } }}
                    onMouseLeave={e => { if (currentVerdict !== 'approved') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)' } }}
                  >
                    <CheckCircle2 style={{ width: 15, height: 15 }} />Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingVerdict('rejected'); setShowVerdictForm(true) }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      ...(currentVerdict === 'rejected'
                        ? { background: 'var(--rose)', color: '#fff', border: '1px solid var(--rose)' }
                        : { background: 'var(--white)', color: 'var(--ink)', border: '1px solid var(--border)' }),
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (currentVerdict !== 'rejected') { e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.color = 'var(--rose)' } }}
                    onMouseLeave={e => { if (currentVerdict !== 'rejected') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--ink)' } }}
                  >
                    <XCircle style={{ width: 15, height: 15 }} />Reject
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
                    display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
                    ...(pendingVerdict === 'approved'
                      ? { background: 'var(--green-lt)', color: 'var(--green)' }
                      : { background: 'var(--rose-lt)', color: 'var(--rose)' }),
                  }}>
                    {pendingVerdict === 'approved' ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : <XCircle style={{ width: 11, height: 11 }} />}
                    {pendingVerdict === 'approved' ? 'Approving' : 'Rejecting'}
                  </div>
                  <textarea
                    value={verdictNotes}
                    onChange={e => setVerdictNotes(e.target.value)}
                    placeholder="Notes (optional)..."
                    rows={2}
                    style={{
                      width: '100%', background: 'var(--white)',
                      border: `1px solid ${verdictNotesFocused ? '#93C5FD' : 'var(--border)'}`,
                      boxShadow: verdictNotesFocused ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
                      borderRadius: 8, padding: '7px 11px', fontSize: 13,
                      fontFamily: 'inherit', color: 'var(--ink)',
                      outline: 'none', resize: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={() => setVerdictNotesFocused(true)}
                    onBlur={() => setVerdictNotesFocused(false)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowVerdictForm(false)}
                      style={{
                        flex: 1, padding: '7px 0', background: 'var(--white)',
                        border: '1px solid var(--border)', color: 'var(--ink)',
                        borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitVerdict}
                      style={{
                        flex: 1, padding: '7px 0', background: 'var(--navy)',
                        color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                        border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {/* Existing approver notes */}
              {approver_notes && currentVerdict !== 'pending' && !showVerdictForm && (
                <p style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>"{approver_notes}"</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PitchDeckView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isApprover, isAdmin } = useRole()
  const [actionNotes, setActionNotes] = useState('')
  const [actionNotesFocused, setActionNotesFocused] = useState(false)
  const [showActionForm, setShowActionForm] = useState<'approve' | 'reject' | 'changes' | null>(null)

  const { data: deck, isLoading } = useQuery({
    queryKey: ['pitch-deck', id],
    queryFn: () => pitchDecksApi.getById(id!).then(r => r.data),
    refetchInterval: 30_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['pitch-deck', id] })

  const approveMutation = useMutation({
    mutationFn: (notes: string) => pitchDecksApi.approve(id!, notes),
    onSuccess: () => { invalidate(); setShowActionForm(null); successToast('Deck approved!') },
    onError: () => errorToast('Failed to approve deck'),
  })
  const rejectMutation = useMutation({
    mutationFn: (notes: string) => pitchDecksApi.reject(id!, notes),
    onSuccess: () => { invalidate(); setShowActionForm(null); successToast('Deck rejected') },
    onError: () => errorToast('Failed to reject deck'),
  })
  const changesMutation = useMutation({
    mutationFn: (notes: string) => pitchDecksApi.requestChanges(id!, notes),
    onSuccess: () => { invalidate(); setShowActionForm(null); successToast('Changes requested — casting manager notified') },
    onError: () => errorToast('Failed to send feedback'),
  })

  const verdictMutation = useMutation({
    mutationFn: ({ finalistId, verdict, notes }: { finalistId: number; verdict: 'approved' | 'rejected'; notes: string }) =>
      pitchDecksApi.setFinalistVerdict(id!, finalistId, verdict, notes),
    onSuccess: (_data, vars) => {
      invalidate()
      successToast(vars.verdict === 'approved' ? 'Finalist approved!' : 'Finalist rejected')
    },
    onError: () => errorToast('Failed to save verdict'),
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 style={{ width: 32, height: 32, color: 'var(--blue)' }} className="animate-spin" />
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 12 }}>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Pitch deck not found</p>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >Go back</button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[deck.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft
  const canApproverAct = (isApprover || isAdmin) && deck.status === 'submitted'
  const canVerdict = (isApprover || isAdmin) && deck.status === 'submitted'
  const sortedFinalists = [...(deck.finalists || [])].sort((a, b) => a.position - b.position)

  const mutationPending = approveMutation.isPending || rejectMutation.isPending || changesMutation.isPending

  return (
    <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto" style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
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
            <h1 style={{
              fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26,
              color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{deck.title}</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, margin: '5px 0 0' }}>
              {sortedFinalists.length} finalist{sortedFinalists.length !== 1 ? 's' : ''}
              {deck.submitted_at && ` · submitted ${new Date(deck.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            background: statusCfg.bg, color: statusCfg.color,
            fontSize: 12.5, fontWeight: 500,
          }}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>

        {/* Manager's notes */}
        {deck.notes && (
          <div style={{
            background: 'var(--white)', borderRadius: 12,
            border: '1px solid var(--border)', padding: '16px 20px', marginBottom: 16,
          }}>
            <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--faint)', marginBottom: 8, margin: '0 0 8px' }}>Manager's overview</p>
            <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{deck.notes}</p>
          </div>
        )}

        {/* Reviewer notes (if acted upon) */}
        {deck.reviewer_notes && (
          <div style={{
            borderRadius: 12, padding: '16px 20px', marginBottom: 16,
            ...(deck.status === 'approved'
              ? { background: 'var(--green-lt)', border: '1px solid #A7F3D0' }
              : deck.status === 'rejected'
              ? { background: 'var(--rose-lt)', border: '1px solid #FECACA' }
              : { background: 'var(--amber-lt)', border: '1px solid #FDE68A' }),
          }}>
            <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--muted)', marginBottom: 8, margin: '0 0 8px' }}>Approver feedback</p>
            <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0 }}>{deck.reviewer_notes}</p>
          </div>
        )}

        {/* Approver action panel */}
        {canApproverAct && (
          <div style={{
            background: 'var(--white)', borderRadius: 12,
            border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--faint)', margin: 0 }}>Your decision</p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {!showActionForm ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowActionForm('approve')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', background: 'var(--green)', color: '#fff',
                      borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <CheckCircle2 style={{ width: 15, height: 15 }} />Approve deck
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowActionForm('changes')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px',
                      background: 'var(--amber-lt)', border: '1px solid var(--amber)',
                      color: 'var(--amber)',
                      borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <RefreshCw style={{ width: 15, height: 15 }} />Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowActionForm('reject')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '8px 16px', background: 'var(--rose)', color: '#fff',
                      borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <XCircle style={{ width: 15, height: 15 }} />Reject
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 500, padding: '5px 12px', borderRadius: 8,
                    display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                    ...(showActionForm === 'approve'
                      ? { background: 'var(--green-lt)', color: 'var(--green)' }
                      : showActionForm === 'reject'
                      ? { background: 'var(--rose-lt)', color: 'var(--rose)' }
                      : { background: 'var(--amber-lt)', color: 'var(--amber)' }),
                  }}>
                    {showActionForm === 'approve' && <CheckCircle2 style={{ width: 14, height: 14 }} />}
                    {showActionForm === 'reject' && <XCircle style={{ width: 14, height: 14 }} />}
                    {showActionForm === 'changes' && <RefreshCw style={{ width: 14, height: 14 }} />}
                    {showActionForm === 'approve' ? 'Approving deck' : showActionForm === 'reject' ? 'Rejecting deck' : 'Requesting changes'}
                  </div>
                  <textarea
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder={
                      showActionForm === 'changes'
                        ? 'Describe what changes are needed...'
                        : 'Add a note for the casting manager (optional)...'
                    }
                    rows={3}
                    style={{
                      width: '100%', background: 'var(--white)',
                      border: `1px solid ${actionNotesFocused ? '#93C5FD' : 'var(--border)'}`,
                      boxShadow: actionNotesFocused ? '0 0 0 3px rgba(37,99,235,.08)' : 'none',
                      borderRadius: 8, padding: '8px 12px', fontSize: 13,
                      fontFamily: 'inherit', color: 'var(--ink)',
                      outline: 'none', resize: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={() => setActionNotesFocused(true)}
                    onBlur={() => setActionNotesFocused(false)}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => { setShowActionForm(null); setActionNotes('') }}
                      style={{
                        padding: '7px 16px', background: 'var(--white)',
                        border: '1px solid var(--border)', color: 'var(--ink)',
                        borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={mutationPending}
                      onClick={async () => {
                        const label = showActionForm === 'approve' ? 'Approve' : showActionForm === 'reject' ? 'Reject' : 'Request changes'
                        const ok = await confirmDialog({
                          title: `${label} this pitch deck?`,
                          confirmText: label,
                          icon: showActionForm === 'approve' ? 'question' : 'warning',
                          danger: showActionForm === 'reject',
                        })
                        if (!ok) return
                        if (showActionForm === 'approve') approveMutation.mutate(actionNotes)
                        else if (showActionForm === 'reject') rejectMutation.mutate(actionNotes)
                        else changesMutation.mutate(actionNotes)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '7px 18px', background: 'var(--navy)', color: '#fff',
                        borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: 'none',
                        cursor: mutationPending ? 'not-allowed' : 'pointer',
                        opacity: mutationPending ? 0.6 : 1,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!mutationPending) e.currentTarget.style.background = 'var(--navy-2)' }}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
                    >
                      {mutationPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Send style={{ width: 14, height: 14 }} />}
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Finalists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', margin: 0 }}>Finalists</h2>
          {sortedFinalists.map(finalist => (
            <FinalistViewCard
              key={finalist.id}
              finalist={finalist}
              canVerdict={canVerdict}
              onVerdictChange={(verdict, notes) =>
                verdictMutation.mutate({ finalistId: finalist.id, verdict, notes })
              }
            />
          ))}
        </div>

        {/* Audit trail link */}
        <div style={{ marginTop: 20, paddingBottom: 28 }}>
          <button
            type="button"
            onClick={() => navigate(`/pitch-decks/${id}/audit`)}
            style={{
              fontSize: 13, color: 'var(--faint)', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--faint)')}
          >
            <Eye style={{ width: 14, height: 14 }} />View audit log
          </button>
        </div>
      </div>
    </div>
  )
}
