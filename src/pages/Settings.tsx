import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LogOut, Shield, Mail, Hash, ChevronDown,
  CheckCircle2, Loader2, Save, Users,
  MapPin, Phone, Building2, UserCheck,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useRole } from '../hooks/useRole'
import { adminApi, profileApi } from '../lib/api'
import type { UserProfile, AppRole, UserProfileUpdate } from '../lib/api'
import { successToast, errorToast, confirmDialog } from '../lib/swal'
import { Skeleton } from '../components/ui/skeleton'

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  casting_manager: 'Casting Manager',
  approver: 'Approver',
  viewer: 'Viewer',
}

const ROLE_STYLES: Record<AppRole, { color: string; bg: string }> = {
  admin:           { color: 'var(--rose)',   bg: 'var(--rose-lt)'   },
  casting_manager: { color: 'var(--blue)',   bg: 'var(--blue-lt)'   },
  approver:        { color: 'var(--purple)', bg: 'var(--purple-lt)' },
  viewer:          { color: 'var(--muted)',  bg: 'var(--surface)'   },
}

// ─── Role Selector (admin only) ───────────────────────────────────────────────

function RoleSelector({ currentRole, onSave }: {
  currentRole: AppRole
  onSave: (role: AppRole) => void
}) {
  const [open, setOpen] = useState(false)
  const roles: AppRole[] = ['admin', 'casting_manager', 'approver', 'viewer']
  const rs = ROLE_STYLES[currentRole]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 8,
          fontSize: 11.5, fontWeight: 600,
          color: rs.color, background: rs.bg,
          border: 'none', cursor: 'pointer',
          opacity: 1, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
      >
        {ROLE_LABELS[currentRole]}
        <ChevronDown style={{ width: 11, height: 11 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: 'var(--white)', borderRadius: 10,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(15,20,35,.1)',
          zIndex: 20, width: 176, overflow: 'hidden',
        }}>
          {roles.map(role => {
            const s = ROLE_STYLES[role]
            return (
              <button
                key={role}
                type="button"
                onClick={() => { onSave(role); setOpen(false) }}
                className="flex items-center justify-between"
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '8px 12px', fontSize: 13,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontWeight: role === currentRole ? 600 : 400,
                  color: 'var(--ink)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <span>{ROLE_LABELS[role]}</span>
                {role === currentRole && <CheckCircle2 style={{ width: 13, height: 13, color: s.color }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Team member row ──────────────────────────────────────────────────────────

function UserRow({ user, onRoleChange, onToggleActive }: {
  user: UserProfile
  onRoleChange: (role: AppRole) => void
  onToggleActive: () => void
}) {
  return (
    <div className="flex items-center gap-3" style={{ padding: '10px 0', opacity: user.is_active ? 1 : 0.5 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
          {(user.full_name || user.email).charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>
          {user.full_name || '—'}
          {!user.is_active && <span style={{ marginLeft: 8, fontSize: 11.5, color: 'var(--rose)' }}>(deactivated)</span>}
        </p>
        <p className="truncate" style={{ fontSize: 12, color: 'var(--faint)' }}>{user.email}</p>
        {user.designation && (
          <p style={{ fontSize: 12, color: 'var(--faint)' }}>{user.designation}{user.team ? ` · ${user.team}` : ''}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <RoleSelector currentRole={user.role} onSave={onRoleChange} />
        <button
          type="button"
          onClick={onToggleActive}
          style={{
            fontSize: 11.5, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
            border: user.is_active ? '1px solid var(--border)' : '1px solid #BBF7D0',
            color: user.is_active ? 'var(--faint)' : 'var(--green)',
            background: 'transparent',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            if (user.is_active) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--rose)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--rose)'
            } else {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--green-lt)'
            }
          }}
          onMouseLeave={e => {
            if (user.is_active) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--faint)'
            } else {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }
          }}
        >
          {user.is_active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  )
}

// ─── My profile edit form ─────────────────────────────────────────────────────

function MyProfileForm({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UserProfileUpdate>({
    full_name: profile.full_name || '',
    designation: profile.designation || '',
    team: profile.team || '',
    location: profile.location || '',
    mobile: profile.mobile || '',
  })
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: UserProfileUpdate) => profileApi.updateMe(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      setSaved(true)
      successToast('Profile saved!')
      setTimeout(() => setSaved(false), 2000)
    },
    onError: () => errorToast('Failed to save profile'),
  })

  const field = (label: string, key: keyof UserProfileUpdate, icon: React.ReactNode) => (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>{label}</label>
      <div className="relative">
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', display: 'flex' }}>{icon}</span>
        <input
          type="text"
          value={(form[key] as string) || ''}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          style={{
            width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
            background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8,
            fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            color: 'var(--ink)',
          }}
          onFocus={e => {
            e.target.style.borderColor = '#93C5FD'
            e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.08)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('Display name', 'full_name', <UserCheck style={{ width: 14, height: 14 }} />)}
        {field('Designation', 'designation', <Building2 style={{ width: 14, height: 14 }} />)}
        {field('Team', 'team', <Users style={{ width: 14, height: 14 }} />)}
        {field('Location', 'location', <MapPin style={{ width: 14, height: 14 }} />)}
        {field('Mobile', 'mobile', <Phone style={{ width: 14, height: 14 }} />)}
      </div>

      <button
        type="button"
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending || saved}
        className="flex items-center gap-2"
        style={{
          padding: '8px 18px', background: saved ? 'var(--green)' : 'var(--navy)',
          color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
          border: 'none', cursor: mutation.isPending || saved ? 'not-allowed' : 'pointer',
          opacity: mutation.isPending || saved ? 0.75 : 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => {
          if (!mutation.isPending && !saved)
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--navy-2)'
        }}
        onMouseLeave={e => {
          if (!mutation.isPending && !saved)
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--navy)'
        }}
      >
        {saved ? (
          <><CheckCircle2 style={{ width: 15, height: 15 }} /> Saved!</>
        ) : mutation.isPending ? (
          <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Saving...</>
        ) : (
          <><Save style={{ width: 15, height: 15 }} /> Save changes</>
        )}
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user, signOut, appRole } = useAuth()
  const { isAdmin } = useRole()
  const qc = useQueryClient()
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [search, setSearch] = useState('')

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileApi.getMe().then(r => r.data),
  })

  const { data: users, isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(r => r.data),
    enabled: isAdmin,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      adminApi.setRole(userId, role),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      successToast(`Role updated to ${ROLE_LABELS[vars.role]}`)
    },
    onError: () => errorToast('Failed to update role'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.updateProfile(userId, { is_active: isActive }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      successToast(vars.isActive ? 'User activated' : 'User deactivated')
    },
    onError: () => errorToast('Failed to update user'),
  })

  const filteredUsers = (users || []).filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const cardStyle = { background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)' }

  return (
    <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)', padding: 28 }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--navy)', letterSpacing: '-0.5px', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>Your profile and team management</p>
        </div>

        {/* My profile */}
        <section style={cardStyle}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>My profile</span>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <div className="flex items-start gap-4" style={{ marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  {(myProfile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{myProfile?.full_name || '—'}</p>
                <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                  <Mail style={{ width: 13, height: 13, color: 'var(--faint)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</span>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 5 }}>
                  {appRole && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 9px', borderRadius: 8,
                      fontSize: 11.5, fontWeight: 600,
                      color: ROLE_STYLES[appRole].color,
                      background: ROLE_STYLES[appRole].bg,
                    }}>
                      <Shield style={{ width: 11, height: 11 }} />
                      {ROLE_LABELS[appRole]}
                    </span>
                  )}
                  {myProfile?.designation && (
                    <span style={{ fontSize: 12, color: 'var(--faint)' }}>{myProfile.designation}</span>
                  )}
                </div>
                <div className="flex items-center gap-1" style={{ marginTop: 4 }}>
                  <Hash style={{ width: 11, height: 11, color: 'var(--faint)' }} />
                  <span style={{ fontSize: 11.5, fontFamily: 'monospace', color: 'var(--faint)' }}>{user?.id?.slice(0, 8)}…</span>
                </div>
              </div>
            </div>

            {myProfile && <MyProfileForm profile={myProfile} />}
          </div>
        </section>

        {/* Admin: Team management */}
        {isAdmin && (
          <section style={cardStyle}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Shield style={{ width: 14, height: 14, color: 'var(--faint)' }} />Team &amp; roles
              </span>
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>{(users || []).length} members</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <p style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 14 }}>
                All @ruskmedia.com users who have signed in. Promote roles or deactivate access here.
              </p>

              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  color: 'var(--ink)', marginBottom: 14, boxSizing: 'border-box',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#93C5FD'
                  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.08)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.boxShadow = 'none'
                }}
              />

              {usersLoading && (
                <div className="space-y-2 py-2">
                  {[1,2,3].map(i => <Skeleton key={i} height={52} borderRadius={8} />)}
                </div>
              )}

              {!usersLoading && (
                <div style={{ borderTop: '1px solid var(--surface)' }}>
                  {filteredUsers.map((u, idx) => (
                    <div key={u.id} style={{ borderBottom: idx < filteredUsers.length - 1 ? '1px solid var(--surface)' : 'none' }}>
                      <UserRow
                        user={u}
                        onRoleChange={role => updateRoleMutation.mutate({ userId: u.id, role })}
                        onToggleActive={async () => {
                          if (u.is_active) {
                            const ok = await confirmDialog({
                              title: 'Deactivate user?',
                              text: `${u.full_name || u.email} will lose access immediately.`,
                              confirmText: 'Deactivate',
                              icon: 'warning',
                              danger: true,
                            })
                            if (!ok) return
                          }
                          toggleActiveMutation.mutate({ userId: u.id, isActive: !u.is_active })
                        }}
                      />
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '20px 0' }}>
                      {search ? 'No matches' : 'No team members yet — ask them to sign in first'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Sign out */}
        <section style={cardStyle}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <LogOut style={{ width: 14, height: 14, color: 'var(--faint)' }} />Sign out
            </span>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>End your session on this device.</p>

            {!signOutConfirm ? (
              <button
                type="button"
                onClick={() => setSignOutConfirm(true)}
                style={{
                  padding: '8px 16px', border: '1px solid var(--rose)', color: 'var(--rose)',
                  background: 'transparent', borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--rose-lt)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                Sign out
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <p style={{ fontSize: 13, color: 'var(--ink)' }}>Are you sure?</p>
                <button
                  type="button"
                  onClick={signOut}
                  style={{
                    padding: '8px 16px', background: 'var(--rose)', color: '#fff',
                    borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#B91C1C'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--rose)'}
                >
                  Yes, sign out
                </button>
                <button
                  type="button"
                  onClick={() => setSignOutConfirm(false)}
                  style={{
                    padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--ink)', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--border)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
