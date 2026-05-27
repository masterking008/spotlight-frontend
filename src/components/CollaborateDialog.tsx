import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Search, UserPlus, Loader2 } from 'lucide-react'
import { castingCallsApi, usersApi } from '../lib/api'
import type { CastingCall, Collaborator, UserProfile } from '../lib/api'
import { useAuth } from '../lib/auth'
import { errorToast } from '../lib/swal'

interface Props {
  castingCall: CastingCall
  onClose: () => void
}

export function CollaborateDialog({ castingCall, onClose }: Props) {
  const qc = useQueryClient()
  const { user } = useAuth()

  const [collaborators, setCollaborators] = useState<Collaborator[]>(castingCall.collaborators ?? [])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load eligible managers once
  useEffect(() => {
    usersApi.searchManagers().then(r => setAllUsers(r.data)).catch(() => {})
    setTimeout(() => searchRef.current?.focus(), 80)
  }, [])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['casting-calls'] })
    qc.invalidateQueries({ queryKey: ['casting-call', castingCall.id] })
  }, [qc, castingCall.id])

  const collaboratorIds = new Set(collaborators.map(c => c.id))

  const suggestions = allUsers.filter(u => {
    if (!['casting_manager', 'admin'].includes(u.role)) return false
    if (u.id === castingCall.owner_id) return false
    if (u.id === user?.id) return false
    if (collaboratorIds.has(u.id)) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const handleAdd = useCallback(async (u: UserProfile) => {
    setSaving(u.id)
    try {
      const res = await castingCallsApi.addCollaborator(castingCall.id, u.id)
      setCollaborators(res.data.collaborators ?? [])
      setQuery('')
      invalidate()
    } catch {
      errorToast('Failed to add collaborator')
    } finally {
      setSaving(null)
    }
  }, [castingCall.id, invalidate])

  const handleRemove = useCallback(async (userId: string) => {
    setSaving(userId)
    try {
      const res = await castingCallsApi.removeCollaborator(castingCall.id, userId)
      setCollaborators(res.data.collaborators ?? [])
      invalidate()
    } catch {
      errorToast('Failed to remove collaborator')
    } finally {
      setSaving(null)
    }
  }, [castingCall.id, invalidate])

  const AVATAR_COLORS = ['#BE185D', '#1D4ED8', '#6D28D9', '#065F46', '#B45309', '#0369A1']
  const avatarColor = (s = '') => AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Dialog */}
      <div
        style={{
          width: '100%', maxWidth: 460,
          background: '#fff', borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 16px',
          borderBottom: '1px solid #F3F4F6',
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
              Add collaborators
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
              {castingCall.title}
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#9CA3AF', display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>

          {/* Search input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 10,
            border: '1.5px solid #E5E7EB', background: '#FAFAFA',
            marginBottom: 14, transition: 'border-color 0.15s',
          }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = '#93C5FD')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
          >
            <Search style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13, color: '#111827', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Suggestions */}
          {query.trim() && (
            <div style={{
              border: '1px solid #F3F4F6', borderRadius: 10, overflow: 'hidden',
              marginBottom: 16, maxHeight: 180, overflowY: 'auto',
            }}>
              {suggestions.length === 0 ? (
                <p style={{ fontSize: 12.5, color: '#9CA3AF', padding: '12px 14px', margin: 0 }}>
                  No managers found
                </p>
              ) : suggestions.map(u => (
                <button
                  key={u.id}
                  type="button"
                  disabled={saving === u.id}
                  onClick={() => handleAdd(u)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', border: 'none', background: 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                    borderBottom: '1px solid #F9FAFB',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: avatarColor(u.full_name || u.email),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.email}
                    </p>
                    {u.full_name && (
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{u.email}</p>
                    )}
                  </div>
                  {saving === u.id
                    ? <Loader2 style={{ width: 14, height: 14, color: '#9CA3AF', animation: 'spin 0.8s linear infinite' }} />
                    : <UserPlus style={{ width: 14, height: 14, color: '#9CA3AF' }} />
                  }
                </button>
              ))}
            </div>
          )}

          {/* Current collaborators */}
          {collaborators.length > 0 ? (
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 8px' }}>
                People with access
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {collaborators.map(c => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 10,
                      border: '1px solid #F3F4F6', background: '#FAFAFA',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: avatarColor(c.full_name || c.email),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff' }}>
                        {(c.full_name || c.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.full_name || c.email}
                      </p>
                      {c.full_name && (
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{c.email}</p>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                      editor
                    </span>
                    <button
                      type="button"
                      disabled={saving === c.id}
                      onClick={() => handleRemove(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#D1D5DB', display: 'flex', borderRadius: 6, flexShrink: 0, transition: 'color 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                    >
                      {saving === c.id
                        ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 0.8s linear infinite' }} />
                        : <X style={{ width: 13, height: 13 }} />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : !query.trim() && (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '16px 0 4px', margin: 0 }}>
              No collaborators yet. Search above to add someone.
            </p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
