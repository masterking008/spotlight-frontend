import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, Calendar, ExternalLink, Pencil, UserPlus } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useCastingCalls } from '../hooks/useQueries'
import { Skeleton } from '../components/ui/skeleton'
import { getCastingCallUrl } from '../lib/utils'
import { CollaborateDialog } from '../components/CollaborateDialog'
import type { CastingCall } from '../lib/api'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:   { label: 'Open',   color: 'var(--green)', bg: 'var(--green-lt)' },
  closed: { label: 'Closed', color: 'var(--rose)',  bg: 'var(--rose-lt)'  },
  draft:  { label: 'Draft',  color: 'var(--muted)', bg: 'var(--surface)'  },
}

export default function Dashboard() {
  const [search, setSearch] = useState('')
  const [collaborateCall, setCollaborateCall] = useState<CastingCall | null>(null)
  const { user } = useAuth()

  const { data: castingCalls, isLoading, error } = useCastingCalls()

  const filtered = castingCalls?.filter(c =>
    [c.title, c.show, c.role].some(f => f.toLowerCase().includes(search.toLowerCase()))
  ) || []

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex-1 overflow-auto" style={{ padding: 28 }}>
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--navy)', letterSpacing: '-0.5px', lineHeight: 1 }}>
            Casting Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Link
          to="/calls/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[12.5px] font-medium transition-colors"
          style={{ background: 'var(--navy)', letterSpacing: '0.1px' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
        >
          <Plus size={13} />
          New Casting Call
        </Link>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 mb-5 px-5 py-3 rounded-xl"
        style={{ background: 'var(--white)', border: '1px solid var(--border)' }}
      >
        <Search size={13} style={{ color: 'var(--faint)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search casting calls…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 outline-none text-[12.5px]"
          style={{ background: 'transparent', border: 'none', color: 'var(--ink)', fontFamily: 'inherit' }}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl p-5" style={{ background: 'var(--white)', border: '1px solid var(--border)' }}>
              <Skeleton height={16} width="60%" className="mb-2" />
              <Skeleton height={12} width="40%" className="mb-4" />
              <Skeleton height={12} count={2} className="mb-1" />
              <Skeleton height={32} className="mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl px-5 py-4 text-[13px]" style={{ background: 'var(--rose-lt)', border: '1px solid #FECACA', color: 'var(--rose)' }}>
          Failed to load casting calls. Please try again.
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && (
        filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map(call => {
              const s = STATUS_CONFIG[call.status] || STATUS_CONFIG.draft
              return (
                <div
                  key={call.id}
                  className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
                  style={{ background: 'var(--white)', border: '1px solid var(--border)' }}
                >
                  {/* Card header */}
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.1px' }}>
                        {call.title}
                      </h3>
                      <span
                        className="shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 4 }}>{call.show} · {call.role}</p>
                  </div>

                  {/* Card body */}
                  <div className="px-5 py-4 space-y-3">
                    {call.description && (
                      <p className="line-clamp-2" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{call.description}</p>
                    )}
                    <div className="flex items-center justify-between" style={{ fontSize: 11.5, color: 'var(--faint)' }}>
                      <span className="flex items-center gap-1"><Users size={12} /> 0 applications</span>
                      {call.deadline && <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(call.deadline)}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Link
                        to={`/casting-calls/${call.id}/applications`}
                        className="flex-1 text-center py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                        style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                      >
                        View Applications
                      </Link>
                      <button
                        type="button"
                        onClick={() => setCollaborateCall(call)}
                        title="Add collaborators"
                        className="flex items-center justify-center w-8 rounded-lg transition-colors"
                        style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                      >
                        <UserPlus size={13} />
                      </button>
                      <Link
                        to={`/calls/${call.id}/edit`}
                        className="flex items-center justify-center w-8 rounded-lg transition-colors"
                        style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                      >
                        <Pencil size={13} />
                      </Link>
                    </div>

                    {call.status === 'open' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const slugUrl = getCastingCallUrl(call.show, call.role)
                            navigator.clipboard.writeText(`${window.location.origin}${slugUrl}`)
                          }}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                          style={{ background: 'var(--blue-lt)', color: 'var(--blue)', border: '1px solid #BFDBFE', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          <ExternalLink size={12} /> Copy Link
                        </button>
                        <Link
                          to={getCastingCallUrl(call.show, call.role)}
                          target="_blank"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                          style={{ background: 'var(--green-lt)', color: 'var(--green)', border: '1px solid #A7F3D0' }}
                        >
                          <ExternalLink size={12} /> Preview
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Plus size={20} style={{ color: 'var(--faint)' }} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
              {search ? 'No casting calls found' : 'No casting calls yet'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {search ? 'Try adjusting your search terms' : 'Get started by creating your first casting call'}
            </p>
            {!search && (
              <Link
                to="/calls/new"
                className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-lg text-white text-[12.5px] font-medium"
                style={{ background: 'var(--navy)' }}
              >
                <Plus size={13} /> Create Casting Call
              </Link>
            )}
          </div>
        )
      )}
      {collaborateCall && (
        <CollaborateDialog
          castingCall={collaborateCall}
          onClose={() => setCollaborateCall(null)}
        />
      )}
    </div>
  )
}
