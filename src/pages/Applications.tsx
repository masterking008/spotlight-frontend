import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Filter, LayoutGrid, List, Users, Download,
  ChevronLeft, ChevronRight, Video, Image as ImageIcon, Tag,
} from 'lucide-react'
import { castingCallsApi, applicationsApi } from '../lib/api'
import type { Application } from '../lib/api'
import { PRESET_TAGS } from '../lib/utils'
import { ApplicationDetailModal } from '../components/ApplicationDetailModal'
import { Skeleton } from '../components/ui/skeleton'

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  new:         { label: 'New',         dot: '#2563EB' },
  reviewing:   { label: 'Reviewing',   dot: '#D97706' },
  shortlisted: { label: 'Shortlisted', dot: '#7C3AED' },
  pitched:     { label: 'Pitched',     dot: '#D97706' },
  approved:    { label: 'Approved',    dot: '#059669' },
  cast:        { label: 'Cast',        dot: '#059669' },
  rejected:    { label: 'Rejected',    dot: '#DC2626' },
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  new:         { bg: 'var(--blue-lt)',   color: 'var(--blue)' },
  reviewing:   { bg: 'var(--amber-lt)',  color: 'var(--amber)' },
  shortlisted: { bg: 'var(--purple-lt)', color: 'var(--purple)' },
  pitched:     { bg: 'var(--amber-lt)',  color: 'var(--amber)' },
  approved:    { bg: 'var(--green-lt)',  color: 'var(--green)' },
  cast:        { bg: 'var(--green-lt)',  color: 'var(--green)' },
  rejected:    { bg: 'var(--rose-lt)',   color: 'var(--rose)' },
}

const PAGE_SIZE = 48


export default function Applications() {
  const { id: routeId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCallId, setSelectedCallId] = useState<string | null>(routeId ?? null)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sort, setSort] = useState('submitted_at_desc')
  const [page, setPage] = useState(1)
  const [searchFocused, setSearchFocused] = useState(false)
  const [sortFocused, setSortFocused] = useState(false)
  const [selectFocused, setSelectFocused] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (routeId) setSelectedCallId(routeId)
  }, [routeId])

  // Sync search into URL
  useEffect(() => {
    if (search) setSearchParams({ search }, { replace: true })
    else setSearchParams({}, { replace: true })
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, statusFilter, tagFilter, sort, selectedCallId])

  const { data: castingCalls } = useQuery({
    queryKey: ['casting-calls'],
    queryFn: () => castingCallsApi.getAll().then(r => r.data),
  })

  // Single unified query — always fetches all, optionally scoped to a casting call
  const { data: appsResponse, isLoading } = useQuery({
    queryKey: ['applications-all', selectedCallId, search, statusFilter, tagFilter, sort, page],
    queryFn: async () => {
      const res = await applicationsApi.getAll({
        casting_call_id: selectedCallId ?? undefined,
        search: search || undefined,
        status: statusFilter.length ? statusFilter.join(',') : undefined,
        tags: tagFilter.length ? tagFilter.join(',') : undefined,
        sort,
        page,
        page_size: PAGE_SIZE,
      })
      const total = Number(res.headers?.['x-total-count'] || res.data.length)
      return { apps: res.data as Application[], total }
    },
  })

  const toggleTag = (tag: string) =>
    setTagFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const apps = appsResponse?.apps || []
  const total = appsResponse?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const toggleStatus = (s: string) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const exportCSV = () => {
    if (!apps.length) return
    const headers = ['Name', 'Phone', 'Email', 'Age', 'City', 'Languages', 'Status', 'Tracking ID', 'Submitted']
    const rows = apps.map(a => [
      a.applicant?.name || '',
      a.applicant?.phone || '',
      a.applicant?.email || '',
      a.applicant?.age || '',
      a.applicant?.city || '',
      (a.applicant?.languages || []).join('; '),
      a.status,
      a.tracking_id,
      new Date(a.submitted_at).toLocaleDateString('en-IN'),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'applications.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const inputBase: React.CSSProperties = {
    background: 'var(--white)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '7px 11px',
    fontSize: 13,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{
        background: 'var(--white)', borderBottom: '1px solid var(--border)',
        padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0 }}>Applications</h1>
          {total > 0 && (
            <p style={{ fontSize: 12, color: 'var(--faint)', marginTop: 3, margin: '3px 0 0' }}>
              {total} application{total !== 1 ? 's' : ''}
              {statusFilter.length > 0 && ` · filtered`}
            </p>
          )}
        </div>

        {/* Casting call filter */}
        <div style={{ flex: '1 1 180px', maxWidth: 280 }}>
          <select
            value={selectedCallId ?? ''}
            onChange={(e) => { setSelectedCallId(e.target.value || null); setPage(1) }}
            style={{
              ...inputBase,
              width: '100%',
              cursor: 'pointer',
              ...(selectFocused ? { borderColor: '#93C5FD', boxShadow: '0 0 0 3px rgba(37,99,235,.08)' } : {}),
            }}
            onFocus={() => setSelectFocused(true)}
            onBlur={() => setSelectFocused(false)}
          >
            <option value="">All casting calls</option>
            {castingCalls?.map(cc => (
              <option key={cc.id} value={cc.id}>{cc.title}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--faint)' }} />
          <input
            type="text"
            placeholder="Search name, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...inputBase,
              width: 220,
              paddingLeft: 32,
              ...(searchFocused ? { borderColor: '#93C5FD', boxShadow: '0 0 0 3px rgba(37,99,235,.08)' } : {}),
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 8, fontSize: 12.5,
              cursor: 'pointer', transition: 'background 0.15s',
              ...(statusFilter.length > 0
                ? { background: 'var(--blue-lt)', border: '1px solid var(--blue-mid)', color: 'var(--blue)' }
                : { background: 'var(--white)', border: '1px solid var(--border)', color: 'var(--ink)' }),
            }}
            onMouseEnter={e => { if (statusFilter.length === 0) e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={e => { if (statusFilter.length === 0) e.currentTarget.style.background = 'var(--white)' }}
          >
            <Filter style={{ width: 13, height: 13 }} />
            Filters
            {statusFilter.length > 0 && (
              <span style={{
                background: 'var(--blue)', color: '#fff',
                fontSize: 10, borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {statusFilter.length}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              ...inputBase,
              cursor: 'pointer',
              ...(sortFocused ? { borderColor: '#93C5FD', boxShadow: '0 0 0 3px rgba(37,99,235,.08)' } : {}),
            }}
            onFocus={() => setSortFocused(true)}
            onBlur={() => setSortFocused(false)}
          >
            <option value="submitted_at_desc">Newest first</option>
            <option value="submitted_at_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
          </select>

          {/* View toggle */}
          <div style={{
            display: 'flex', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 9px', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                ...(viewMode === 'grid'
                  ? { background: 'var(--white)', color: 'var(--navy)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }
                  : { background: 'transparent', color: 'var(--faint)' }),
              }}
            >
              <LayoutGrid style={{ width: 15, height: 15 }} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 9px', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                ...(viewMode === 'table'
                  ? { background: 'var(--white)', color: 'var(--navy)', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }
                  : { background: 'transparent', color: 'var(--faint)' }),
              }}
            >
              <List style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={exportCSV}
            disabled={!apps.length}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', background: 'var(--white)',
              border: '1px solid var(--border)', color: 'var(--ink)',
              borderRadius: 8, fontSize: 12.5, cursor: apps.length ? 'pointer' : 'not-allowed',
              opacity: apps.length ? 1 : 0.4, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (apps.length) e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
          >
            <Download style={{ width: 13, height: 13 }} />
            Export
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '10px 24px' }}>
          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', width: 44 }}>Status</span>
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                  cursor: 'pointer', border: 'none', transition: 'all 0.12s',
                  ...(statusFilter.includes(status)
                    ? { background: 'var(--navy)', color: '#fff' }
                    : { background: 'var(--surface)', color: 'var(--muted)' }),
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                {cfg.label}
              </button>
            ))}
            {statusFilter.length > 0 && (
              <button type="button" onClick={() => setStatusFilter([])}
                style={{ fontSize: 11.5, color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--faint)')}>
                Clear
              </button>
            )}
          </div>

          {/* Tags row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', width: 44 }}>Tags</span>
            {PRESET_TAGS.map(t => (
              <button
                key={t.name}
                type="button"
                onClick={() => toggleTag(t.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.12s',
                  ...(tagFilter.includes(t.name)
                    ? { background: t.color, color: '#fff', border: `1px solid ${t.color}` }
                    : { background: t.bg, color: t.color, border: `1px solid transparent` }),
                }}
              >
                <span>{t.emoji}</span> {t.name}
              </button>
            ))}
            {tagFilter.length > 0 && (
              <button type="button" onClick={() => setTagFilter([])}
                style={{ fontSize: 11.5, color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--rose)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--faint)')}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} height={208} borderRadius={12} />
            ))}
          </div>
        )}

        {!isLoading && apps.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, textAlign: 'center' }}>
            <Users style={{ width: 44, height: 44, color: 'var(--border)', marginBottom: 12 }} />
            <p style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 14, margin: '0 0 4px' }}>No applications found</p>
            <p style={{ fontSize: 13, color: 'var(--faint)', margin: 0 }}>
              {search || statusFilter.length > 0 ? 'Try adjusting your filters' : 'Applications will appear here once talent submits'}
            </p>
          </div>
        )}

        {!isLoading && apps.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: 12 }}>
                {apps.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    onClick={() => setSelectedApp(app)}
                    queryClient={queryClient}
                  />
                ))}
              </div>
            ) : (
              <ApplicationTable
                apps={apps}
                onRowClick={(app) => setSelectedApp(app)}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: 7, background: 'var(--white)', border: '1px solid var(--border)',
                    borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer',
                    opacity: page === 1 ? 0.4 : 1, display: 'flex',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (page !== 1) e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                >
                  <ChevronLeft style={{ width: 15, height: 15, color: 'var(--ink)' }} />
                </button>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Page {page} of {totalPages} · {total} total
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: 7, background: 'var(--white)', border: '1px solid var(--border)',
                    borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    opacity: page === totalPages ? 0.4 : 1, display: 'flex',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (page !== totalPages) e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
                >
                  <ChevronRight style={{ width: 15, height: 15, color: 'var(--ink)' }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onPrev={() => {
            const idx = apps.findIndex(a => a.id === selectedApp.id)
            if (idx > 0) setSelectedApp(apps[idx - 1])
          }}
          onNext={() => {
            const idx = apps.findIndex(a => a.id === selectedApp.id)
            if (idx < apps.length - 1) setSelectedApp(apps[idx + 1])
          }}
          hasPrev={apps.findIndex(a => a.id === selectedApp.id) > 0}
          hasNext={apps.findIndex(a => a.id === selectedApp.id) < apps.length - 1}
        />
      )}
    </div>
  )
}

// ─── Application Card (grid view) ─────────────────────────────────────────────

function ApplicationCard({ app, onClick, queryClient }: {
  app: Application
  onClick: () => void
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const photo = app.media?.find(m => m.type === 'photo' && m.url)
  const hasVideo = app.media?.some(m => m.type === 'video')
  const { applicant, tags = [] } = app
  const [hovered, setHovered] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const statusStyle = STATUS_STYLES[app.status] || { bg: 'var(--surface)', color: 'var(--muted)' }

  const tagNames = tags.map(t => t.tag_name)

  const toggleTagMutation = useMutation({
    mutationFn: (tagName: string) =>
      tagNames.includes(tagName)
        ? applicationsApi.removeTag(app.id, tagName)
        : applicationsApi.addTag(app.id, tagName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications-all'] }),
  })

  return (
    <div
      style={{
        background: 'var(--white)',
        borderRadius: 12,
        border: `1px solid ${hovered ? 'var(--border-2)' : 'var(--border)'}`,
        boxShadow: hovered ? '0 4px 14px rgba(0,0,0,0.07)' : 'none',
        textAlign: 'left',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowTagPicker(false) }}
    >
      {/* Clickable photo area */}
      <button
        type="button"
        onClick={onClick}
        style={{ cursor: 'pointer', border: 'none', padding: 0, background: 'none', display: 'block' }}
      >
        <div style={{ aspectRatio: '4/3', background: 'var(--blue-lt)', position: 'relative', overflow: 'hidden' }}>
          {photo?.url ? (
            <img
              src={photo.url}
              alt={applicant?.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hovered ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.3s' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--blue-lt)', border: '2px solid var(--blue-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--blue)', fontWeight: 700, fontSize: 16,
              }}>
                {applicant?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          {/* Media indicators */}
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
            {photo && (
              <span style={{ width: 20, height: 20, background: 'rgba(0,0,0,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon style={{ width: 11, height: 11, color: '#fff' }} />
              </span>
            )}
            {hasVideo && (
              <span style={{ width: 20, height: 20, background: 'rgba(0,0,0,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video style={{ width: 11, height: 11, color: '#fff' }} />
              </span>
            )}
          </div>

          {/* Status badge */}
          <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: statusStyle.bg, color: statusStyle.color }}>
              {STATUS_CONFIG[app.status]?.label || app.status}
            </span>
          </div>
        </div>
      </button>

      {/* Info + tag strip */}
      <div style={{ padding: '10px 12px 8px' }}>
        <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          <p style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{applicant?.name}</p>
          <p style={{ fontSize: 11, color: 'var(--faint)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[applicant?.city, applicant?.age ? `${applicant.age}y` : null].filter(Boolean).join(' · ')}
          </p>
        </button>

        {/* Applied tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {tags.slice(0, 3).map(t => {
              const preset = PRESET_TAGS.find(p => p.name === t.tag_name)
              return (
                <span key={t.id} style={{
                  fontSize: 10.5, padding: '2px 7px', borderRadius: 5, fontWeight: 500,
                  background: preset?.bg ?? 'var(--surface)',
                  color: preset?.color ?? 'var(--muted)',
                  border: '1px solid transparent',
                }}>
                  {preset?.emoji} {t.tag_name}
                </span>
              )
            })}
            {tags.length > 3 && <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>+{tags.length - 3}</span>}
          </div>
        )}

        {/* Quick-tag row — visible on hover */}
        {hovered && (
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 7 }}>
            {!showTagPicker ? (
              <button
                type="button"
                onClick={() => setShowTagPicker(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, color: 'var(--muted)', background: 'none',
                  border: '1px dashed var(--border)', borderRadius: 6,
                  padding: '3px 8px', cursor: 'pointer', width: '100%', justifyContent: 'center',
                }}
              >
                <Tag style={{ width: 11, height: 11 }} /> Quick tag
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {PRESET_TAGS.map(t => {
                  const active = tagNames.includes(t.name)
                  return (
                    <button
                      key={t.name}
                      type="button"
                      disabled={toggleTagMutation.isPending}
                      onClick={() => toggleTagMutation.mutate(t.name)}
                      title={t.name}
                      style={{
                        fontSize: 14, padding: '3px 6px', borderRadius: 6,
                        cursor: 'pointer', transition: 'transform 0.1s',
                        background: active ? t.bg : 'var(--surface)',
                        border: `1px solid ${active ? t.color : 'transparent'}`,
                        opacity: toggleTagMutation.isPending ? 0.5 : 1,
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {t.emoji}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Application Table (list view) ────────────────────────────────────────────

function ApplicationTable({ apps, onRowClick }: { apps: Application[]; onRowClick: (app: Application) => void }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {['Name', 'City', 'Languages', 'Status', 'Submitted', 'Media'].map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: 'left', padding: '10px 16px',
                  fontSize: 10.5, fontWeight: 600, color: 'var(--faint)',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                }}
                className={i === 1 ? 'hidden sm:table-cell' : i === 2 ? 'hidden md:table-cell' : i === 4 ? 'hidden lg:table-cell' : ''}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => {
            const hasPhoto = app.media?.some(m => m.type === 'photo')
            const hasVideo = app.media?.some(m => m.type === 'video')
            const statusStyle = STATUS_STYLES[app.status] || { bg: 'var(--surface)', color: 'var(--muted)' }
            return (
              <tr
                key={app.id}
                onClick={() => onRowClick(app)}
                style={{ borderBottom: '1px solid #F5F4F1', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FAFAF8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--blue-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--blue)', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {app.applicant?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 12.5, margin: 0 }}>{app.applicant?.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--faint)', margin: 0 }}>{app.applicant?.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell" style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12.5 }}>{app.applicant?.city || '—'}</td>
                <td className="hidden md:table-cell" style={{ padding: '10px 16px', color: 'var(--muted)', fontSize: 12 }}>
                  {app.applicant?.languages?.join(', ') || '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
                    background: statusStyle.bg, color: statusStyle.color,
                  }}>
                    {STATUS_CONFIG[app.status]?.label || app.status}
                  </span>
                </td>
                <td className="hidden lg:table-cell" style={{ padding: '10px 16px', color: 'var(--faint)', fontSize: 12 }}>
                  {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {hasPhoto && <ImageIcon style={{ width: 15, height: 15, color: 'var(--faint)' }} />}
                    {hasVideo && <Video style={{ width: 15, height: 15, color: 'var(--faint)' }} />}
                    {!hasPhoto && !hasVideo && <span style={{ color: 'var(--border)', fontSize: 12 }}>—</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
