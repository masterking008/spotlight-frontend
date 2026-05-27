import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight,
  FileText, Calendar, Users,
} from 'lucide-react'
import { pitchDecksApi } from '../lib/api'
import type { PitchDeck } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:             { label: 'Draft',             color: 'var(--muted)',  bg: 'var(--surface)',   icon: <Clock style={{ width: 10, height: 10 }} /> },
  submitted:         { label: 'Awaiting review',   color: 'var(--amber)',  bg: 'var(--amber-lt)',  icon: <Clock style={{ width: 10, height: 10 }} /> },
  approved:          { label: 'Approved',           color: 'var(--green)',  bg: 'var(--green-lt)',  icon: <CheckCircle2 style={{ width: 10, height: 10 }} /> },
  rejected:          { label: 'Rejected',           color: 'var(--rose)',   bg: 'var(--rose-lt)',   icon: <XCircle style={{ width: 10, height: 10 }} /> },
  changes_requested: { label: 'Changes requested', color: 'var(--amber)',  bg: 'var(--amber-lt)',  icon: <RefreshCw style={{ width: 10, height: 10 }} /> },
}

function DeckCard({ deck }: { deck: PitchDeck }) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[deck.status] || STATUS_CONFIG.draft
  const pendingVerdicts = (deck.finalists || []).filter(f => !f.approver_verdict || f.approver_verdict === 'pending').length

  return (
    <button
      type="button"
      onClick={() => navigate(`/pitch-decks/${deck.id}`)}
      style={{
        width: '100%',
        background: 'var(--white)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: 20,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'block',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue-mid)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(37,99,235,.07)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4 min-w-0">
          {/* Icon */}
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText style={{ width: 18, height: 18, color: 'var(--blue)' }} />
          </div>

          <div className="min-w-0">
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy)' }} className="truncate">
              {deck.title}
            </p>

            <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 6 }}>
              <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--faint)' }}>
                <Users style={{ width: 11, height: 11 }} />
                {deck.finalists?.length || 0} finalists
              </span>
              {deck.submitted_at && (
                <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--faint)' }}>
                  <Calendar style={{ width: 11, height: 11 }} />
                  {new Date(deck.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {deck.status === 'submitted' && pendingVerdicts > 0 && (
                <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 500 }}>
                  {pendingVerdicts} verdict{pendingVerdicts !== 1 ? 's' : ''} pending
                </span>
              )}
            </div>

            {deck.notes && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{deck.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            fontSize: 11.5, fontWeight: 500,
            color: cfg.color, background: cfg.bg,
          }}>
            {cfg.icon}{cfg.label}
          </span>
          <ChevronRight style={{ width: 14, height: 14, color: 'var(--faint)' }} />
        </div>
      </div>
    </button>
  )
}

export default function ApproverInbox() {
  const { data: decks, isLoading } = useQuery({
    queryKey: ['approver-inbox'],
    queryFn: () => pitchDecksApi.getApproverInbox().then(r => r.data),
    refetchInterval: 60_000,
  })

  const pending = (decks || []).filter(d => d.status === 'submitted')
  const actioned = (decks || []).filter(d => d.status !== 'submitted' && d.status !== 'draft')

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-3">
          <Skeleton height={28} width={200} className="mb-6" />
          {[1,2,3].map(i => <Skeleton key={i} height={88} borderRadius={12} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)', padding: 28 }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0 }}>Approver inbox</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>
            Review pitch decks submitted by casting managers
          </p>
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 16, color: 'var(--navy)', margin: 0 }}>Awaiting your review</h2>
              <span style={{ padding: '2px 9px', background: 'var(--amber-lt)', color: 'var(--amber)', borderRadius: 20, fontSize: 11.5, fontWeight: 700 }}>
                {pending.length}
              </span>
            </div>
            <div className="space-y-3">
              {pending.map(d => <DeckCard key={d.id} deck={d} />)}
            </div>
          </section>
        )}

        {/* Actioned */}
        {actioned.length > 0 && (
          <section>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 16, color: 'var(--navy)', margin: 0, marginBottom: 14 }}>Previously reviewed</h2>
            <div className="space-y-3">
              {actioned.map(d => <DeckCard key={d.id} deck={d} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {(decks || []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: 64, height: 64, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText style={{ width: 28, height: 28, color: 'var(--faint)' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>No pitch decks yet</p>
            <p style={{ fontSize: 13, color: 'var(--faint)', marginTop: 4 }}>Casting managers will submit decks here for your review</p>
          </div>
        )}
      </div>
    </div>
  )
}
