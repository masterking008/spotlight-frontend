import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Megaphone, Users, Star, Film, ArrowRight,
  CheckCircle2, Clock, XCircle, TrendingUp, FileText,
} from 'lucide-react'
import type { CastingCall, Application, PitchDeck, InAppNotification } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useRole } from '../hooks/useRole'
import {
  useOverview,
  useCastingCalls,
  useRecentApplications, 
  useApproverInbox, 
  useNotificationsFeed 
} from '../hooks/useQueries'
import { Skeleton } from '../components/ui/skeleton'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OverviewData {
  total_casting_calls: number
  open_casting_calls: number
  draft_casting_calls: number
  total_applications: number
  shortlisted: number
  approved: number
  cast: number
  rejected: number
  shortlist_rate: number
  applications_by_status: Record<string, number>
  recent_activity: Array<{ date: string; count: number }>
  top_casting_calls: Array<{
    id: number; title: string; show: string; role: string
    status: string; application_count: number
  }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#BE185D', '#1D4ED8', '#6D28D9', '#065F46', '#B45309', '#0369A1', '#7C3AED']
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
const initials = (name = '') => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  new:         { label: 'New',         color: 'var(--blue)',   bg: 'var(--blue-lt)',   bar: '#2563EB' },
  reviewing:   { label: 'Reviewing',   color: 'var(--amber)',  bg: 'var(--amber-lt)',  bar: '#D97706' },
  shortlisted: { label: 'Shortlisted', color: 'var(--purple)', bg: 'var(--purple-lt)', bar: '#7C3AED' },
  pitched:     { label: 'Pitched',     color: 'var(--amber)',  bg: 'var(--amber-lt)',  bar: '#F59E0B' },
  approved:    { label: 'Approved',    color: 'var(--green)',  bg: 'var(--green-lt)',  bar: '#059669' },
  cast:        { label: 'Cast',        color: 'var(--green)',  bg: 'var(--green-lt)',  bar: '#047857' },
  rejected:    { label: 'Rejected',    color: 'var(--rose)',   bg: 'var(--rose-lt)',   bar: '#DC2626' },
}

const CALL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  open:   { label: 'Open',   color: 'var(--green)', bg: 'var(--green-lt)' },
  draft:  { label: 'Draft',  color: 'var(--amber)', bg: 'var(--amber-lt)' },
  closed: { label: 'Closed', color: 'var(--muted)', bg: 'var(--surface)'  },
}

const DECK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:             { label: 'Draft',     color: 'var(--muted)',  bg: 'var(--surface)'   },
  submitted:         { label: 'Review',    color: 'var(--amber)',  bg: 'var(--amber-lt)'  },
  approved:          { label: 'Approved',  color: 'var(--green)',  bg: 'var(--green-lt)'  },
  rejected:          { label: 'Rejected',  color: 'var(--rose)',   bg: 'var(--rose-lt)'   },
  changes_requested: { label: 'Changes',   color: 'var(--rose)',   bg: 'var(--rose-lt)'   },
}

const APP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: 'New',       color: 'var(--blue)',   bg: 'var(--blue-lt)'   },
  reviewing:   { label: 'Review',    color: 'var(--amber)',  bg: 'var(--amber-lt)'  },
  shortlisted: { label: 'Shortlist', color: 'var(--purple)', bg: 'var(--purple-lt)' },
  pitched:     { label: 'Pitched',   color: 'var(--amber)',  bg: 'var(--amber-lt)'  },
  approved:    { label: 'Approved',  color: 'var(--green)',  bg: 'var(--green-lt)'  },
  cast:        { label: 'Cast ✦',    color: 'var(--green)',  bg: 'var(--green-lt)'  },
  rejected:    { label: 'Rejected',  color: 'var(--rose)',   bg: 'var(--rose-lt)'   },
}

function fmtDeadline(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, delta }: {
  label: string; value: number | string; sub?: string; delta?: { text: string; up?: boolean }
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--muted)', letterSpacing: '0.1px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 34, color: 'var(--navy)', letterSpacing: '-1px', lineHeight: 1.1 }}>
        {value}
      </div>
      {delta && (
        <div className="flex items-center gap-1 mt-1.5" style={{ fontSize: 11, fontWeight: 500, color: delta.up ? 'var(--green)' : 'var(--muted)' }}>
          {delta.up && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
            </svg>
          )}
          {delta.text}
        </div>
      )}
      {sub && !delta && <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function AreaChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const W = 440, H = 120, PAD = { t: 8, r: 8, b: 24, l: 32 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const max = Math.max(...data.map(d => d.count), 1)
  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * cW,
    y: PAD.t + (1 - d.count / max) * cH,
    ...d,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.t + cH).toFixed(1)} L${PAD.l},${(PAD.t + cH).toFixed(1)} Z`

  const yTicks = [0, Math.round(max / 2), max]
  const xLabels = data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2))
    .map(d => ({ label: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), idx: data.indexOf(d) }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1C2333" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#1C2333" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Y gridlines */}
      {yTicks.map((v, i) => {
        const y = PAD.t + (1 - v / max) * cH
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y} stroke="#F3F2EF" strokeWidth="1"/>
            <text x={PAD.l - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9CA3AF">{v}</text>
          </g>
        )
      })}
      {/* Area */}
      <path d={areaPath} fill="url(#areaGrad)"/>
      {/* Line */}
      <path d={linePath} fill="none" stroke="#1C2333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {/* X labels */}
      {xLabels.map(({ label, idx }) => {
        const x = PAD.l + (idx / (data.length - 1)) * cW
        return <text key={idx} x={x} y={H - 4} textAnchor="middle" fontSize="9.5" fill="#9CA3AF">{label}</text>
      })}
    </svg>
  )
}

function FunnelBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-3" style={{ marginBottom: 13 }}>
      <div style={{ width: 80, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{label}</div>
      <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: color, transition: 'width 1.4s cubic-bezier(.4,0,.2,1)' }}/>
      </div>
      <div style={{ width: 30, textAlign: 'right', fontSize: 12, fontWeight: 600, color: label.includes('✦') ? 'var(--green)' : 'var(--navy)', flexShrink: 0 }}>{count}</div>
    </div>
  )
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, color, background: bg }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }}/>
      {label}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Overview() {
  const { user } = useAuth()
  const { isApprover, isAdmin } = useRole()
  const [callTab, setCallTab] = useState<'all' | 'open' | 'draft' | 'closed'>('all')

  // ── Data fetching ────────────────────────────────────────────────────────────

  const { data: overview, isLoading: loadingOverview } = useOverview()
  const { data: allCalls = [] } = useCastingCalls()
  
  const topCallId = overview?.top_casting_calls?.[0]?.id
  const { data: recentAppsRaw } = useRecentApplications(topCallId)
  const { data: approverQueue = [] } = useApproverInbox()
  const { data: notifications = [] } = useNotificationsFeed()

  // ── Derived ──────────────────────────────────────────────────────────────────

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = (user?.user_metadata?.full_name as string)?.split(' ')[0] || 'there'

  const filteredCalls = allCalls.filter(c =>
    callTab === 'all' ? true : c.status === callTab
  ).slice(0, 8)

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const totalApps = overview?.total_applications || 0
  const statusEntries = Object.entries(overview?.applications_by_status || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  const funnelMax = totalApps || 1
  const funnelSteps = [
    { label: 'Applied',     count: totalApps,                                            color: '#1C2333' },
    { label: 'Reviewing',   count: overview?.applications_by_status?.reviewing || 0,     color: '#374151' },
    { label: 'Shortlisted', count: overview?.shortlisted || 0,                           color: '#4B5563' },
    { label: 'Pitched',     count: overview?.applications_by_status?.pitched || 0,       color: '#6B7280' },
    { label: 'Approved',    count: overview?.approved || 0,                              color: '#9CA3AF' },
    { label: 'Cast ✦',      count: overview?.cast || 0,                                 color: 'var(--green)' },
  ]

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loadingOverview) {
    return (
      <div className="flex-1 overflow-auto" style={{ padding: 28 }}>
        <Skeleton height={28} width={260} className="mb-1" />
        <Skeleton height={14} width={220} className="mb-8" />
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {[1,2,3,4].map(i => <Skeleton key={i} height={110} borderRadius={12} />)}
        </div>
        <div className="grid gap-3.5 mb-3.5" style={{ gridTemplateColumns: '2fr 1.35fr' }}>
          <Skeleton height={300} borderRadius={12} />
          <Skeleton height={300} borderRadius={12} />
        </div>
        <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <Skeleton height={320} borderRadius={12} />
          <Skeleton height={320} borderRadius={12} />
        </div>
      </div>
    )
  }

  if (!overview) return null

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Page header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--navy)', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {greeting()}, {firstName}.
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>
            {today} · {overview.open_casting_calls} active casting call{overview.open_casting_calls !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/calls/new"
          className="inline-flex items-center gap-1.5 rounded-lg text-white text-[12.5px] font-medium transition-colors"
          style={{ background: 'var(--navy)', padding: '8px 16px' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          New casting call
        </Link>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          label="Active casting calls"
          value={overview.open_casting_calls}
          delta={{ text: `${overview.draft_casting_calls} in draft`, up: false }}
        />
        <KpiCard
          label="Total applications"
          value={totalApps}
          delta={{ text: `${overview.recent_activity.slice(-1)[0]?.count || 0} today`, up: true }}
        />
        <KpiCard
          label="Shortlisted"
          value={overview.shortlisted}
          sub={overview.shortlist_rate ? `${overview.shortlist_rate}% shortlist rate` : undefined}
        />
        <KpiCard
          label="Cast confirmed"
          value={overview.cast}
          delta={{ text: `${overview.approved} pending approval`, up: false }}
        />
      </div>

      {/* ── Row 2: Chart + Funnel ── */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1.35fr' }}>

        {/* Activity chart */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.1px' }}>Applications over time</p>
              <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>Daily inflow · last 14 days</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{overview.recent_activity.reduce((s, d) => s + d.count, 0)}</span>
          </div>
          <div style={{ padding: '16px 16px 12px' }}>
            <AreaChart data={overview.recent_activity} />
          </div>
          {/* Per-show stat row */}
          <div className="flex gap-5 px-5 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            {overview.top_casting_calls.slice(0, 3).map(cc => (
              <div key={cc.id}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.5px' }}>{cc.application_count}</div>
                <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>{cc.show}</div>
              </div>
            ))}
            <div className="ml-auto text-right">
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.5px' }}>
                +{overview.recent_activity.slice(-1)[0]?.count || 0}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>Today</div>
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.1px' }}>
              Pipeline{overview.top_casting_calls[0] ? ` · ${overview.top_casting_calls[0].show}` : ''}
            </p>
            {overview.top_casting_calls[0] && (
              <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>
                {overview.top_casting_calls[0].role}
              </p>
            )}
          </div>
          <div style={{ padding: '18px 20px' }}>
            {funnelSteps.map(s => (
              <FunnelBar key={s.label} label={s.label} count={s.count} max={funnelMax} color={s.color} />
            ))}
          </div>
          <div className="px-5 pb-4" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div className="flex gap-3.5" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {overview.top_casting_calls[0] && (
                <>
                  <span>Top call <strong style={{ color: 'var(--navy)' }}>{overview.top_casting_calls[0].title}</strong></span>
                  <span style={{ color: 'var(--amber)' }}>{overview.top_casting_calls[0].application_count} apps</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Casting calls table + right column ── */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1.5fr 1fr' }}>

        {/* Casting calls table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="card-title" style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Casting calls</div>
            <span style={{ fontSize: 10.5, padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--muted)' }}>
              {allCalls.length} total
            </span>
          </div>

          {/* Tabs */}
          <div className="flex" style={{ padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
            {(['all', 'open', 'draft', 'closed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setCallTab(tab)}
                style={{
                  padding: '10px 12px',
                  fontSize: 12,
                  fontWeight: callTab === tab ? 600 : 500,
                  color: callTab === tab ? 'var(--navy)' : 'var(--faint)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: callTab === tab ? '2px solid var(--navy)' : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                  transition: 'color .13s, border-color .13s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Role / Show', 'Status', 'Apps', 'Deadline', ''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left',
                      padding: i === 0 ? '9px 12px 9px 20px' : i === 4 ? '9px 20px 9px 12px' : '9px 12px',
                      fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.7px', color: 'var(--faint)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
                      No casting calls
                    </td>
                  </tr>
                ) : filteredCalls.map(call => {
                  const s = CALL_STATUS[call.status] || CALL_STATUS.draft
                  const topCc = overview.top_casting_calls.find(c => c.id === call.id)
                  return (
                    <tr
                      key={call.id}
                      style={{ borderBottom: '1px solid #F5F4F1', transition: 'background .1s', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '11px 12px 11px 20px' }}>
                        <Link to={`/casting-calls/${call.id}/applications`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: 500, color: 'var(--navy)', fontSize: 13 }}>{call.title}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>{call.show}</div>
                        </Link>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <Badge label={s.label} color={s.color} bg={s.bg} />
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>
                          {topCc?.application_count ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDeadline(call.deadline)}</span>
                      </td>
                      <td style={{ padding: '11px 20px 11px 12px' }}>
                        <Link
                          to={`/casting-calls/${call.id}/applications`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, color: 'var(--faint)', textDecoration: 'none' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--ink)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--faint)' }}
                        >
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Recent applicants */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Recent applicants</p>
              <Link to="/applications" style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none', fontWeight: 500 }}>
                View all →
              </Link>
            </div>
            <div style={{ padding: '8px 20px' }}>
              {!recentAppsRaw || recentAppsRaw.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '20px 0' }}>No applications yet</p>
              ) : recentAppsRaw.slice(0, 4).map(app => {
                const name = app.applicant?.name || 'Unknown'
                const status = APP_STATUS[app.status] || APP_STATUS.new
                return (
                  <div key={app.id} className="flex items-center gap-3" style={{ padding: '9px 0', borderBottom: '1px solid #F5F4F1' }}>
                    <div
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: avatarColor(name),
                        color: '#fff', fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}
                    >
                      {initials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--navy)' }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>
                        {[app.applicant?.city, app.applicant?.age ? `${app.applicant.age} yrs` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: status.color, background: status.bg, flexShrink: 0 }}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Approver queue — show for approvers & admins */}
          {(isApprover || isAdmin) && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Approver queue</p>
                {approverQueue.filter(d => d.status === 'submitted').length > 0 && (
                  <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: 'var(--amber)', background: 'var(--amber-lt)' }}>
                    {approverQueue.filter(d => d.status === 'submitted').length} pending
                  </span>
                )}
              </div>
              <div style={{ padding: '8px 20px' }}>
                {approverQueue.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '20px 0' }}>Nothing pending review</p>
                ) : approverQueue.slice(0, 4).map(deck => {
                  const s = DECK_STATUS[deck.status] || DECK_STATUS.draft
                  return (
                    <Link
                      key={deck.id}
                      to="/approver/inbox"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #F5F4F1', textDecoration: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={14} style={{ color: 'var(--muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--navy)' }} className="truncate">{deck.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>Deck #{deck.id}</div>
                      </div>
                      <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, color: s.color, background: s.bg, flexShrink: 0 }}>
                        {s.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Status breakdown (for non-approvers who don't see queue) */}
          {!(isApprover || isAdmin) && statusEntries.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>By status</p>
                <TrendingUp size={14} style={{ color: 'var(--faint)' }} />
              </div>
              <div style={{ padding: '16px 20px' }}>
                {statusEntries.map(([status, count]) => {
                  const cfg = STATUS_CONFIG[status]
                  const pct = totalApps ? Math.round((count / totalApps) * 100) : 0
                  return (
                    <div key={status} style={{ marginBottom: 12 }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg?.bar || 'var(--faint)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: 'var(--ink)' }}>{cfg?.label || status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{pct}%</span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--navy)', minWidth: 24, textAlign: 'right' }}>{count}</span>
                        </div>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg?.bar || 'var(--faint)', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Activity feed ── */}
      {notifications.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Activity</p>
            <Link to="/approver/inbox" style={{ fontSize: 11.5, color: 'var(--muted)', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '4px 20px 8px' }}>
            {notifications.slice(0, 6).map((n, i) => (
              <div
                key={n.id}
                style={{
                  display: 'flex', gap: 12, padding: '11px 0',
                  borderBottom: i < 3 ? '1px solid #F5F4F1' : 'none',
                  paddingLeft: i % 3 !== 0 ? 20 : 0,
                  borderLeft: i % 3 !== 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: 'var(--blue-lt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--navy)', fontWeight: 600 }}>{n.title}</strong>
                    {n.body ? ` — ${n.body}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rejected callout ── */}
      {(overview.rejected ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-5 py-3.5" style={{ background: 'var(--rose-lt)', border: '1px solid #FECACA' }}>
          <XCircle size={15} style={{ color: 'var(--rose)', flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: 'var(--rose)' }}>
            <strong>{overview.rejected}</strong> application{overview.rejected !== 1 ? 's' : ''} rejected
            {totalApps ? ` (${Math.round((overview.rejected / totalApps) * 100)}% of total)` : ''}.
          </p>
        </div>
      )}

      <div style={{ height: 8 }} />
    </div>
  )
}
