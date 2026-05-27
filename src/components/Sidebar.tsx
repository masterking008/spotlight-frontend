import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useRole } from '../hooks/useRole'
import { LayoutDashboard, Plus, Users, Settings, LogOut, Inbox, LayoutGrid } from 'lucide-react'
import { applicationsApi, pitchDecksApi } from '../lib/api'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  casting_manager: 'Casting Manager',
  approver: 'Approver',
  viewer: 'Viewer',
}

export function Sidebar() {
  const location = useLocation()
  const { signOut, user } = useAuth()
  const { isManager, isApprover, isAdmin, role } = useRole()

  // Badge counts
  const { data: appsData } = useQuery({
    queryKey: ['sidebar-apps-count'],
    queryFn: () => applicationsApi.getAll({ status: 'new', page_size: 1 }).then(r => Number(r.headers?.['x-total-count'] || 0)),
    refetchInterval: 60_000,
    enabled: isManager || isApprover || isAdmin,
  })

  const { data: inboxData } = useQuery({
    queryKey: ['approver-inbox-count'],
    queryFn: () => pitchDecksApi.getApproverInbox().then(r => r.data.filter(d => d.status === 'submitted').length),
    refetchInterval: 60_000,
    enabled: isApprover || isAdmin,
  })

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutGrid, show: true, badge: null },
    { href: '/dashboard', label: 'Casting Calls', icon: LayoutDashboard, show: true, badge: null },
    { href: '/applications', label: 'Applications', icon: Users, show: isManager || isApprover || isAdmin, badge: appsData || null, badgeAlert: false },
    { href: '/approver/inbox', label: 'Approver Inbox', icon: Inbox, show: isApprover || isAdmin, badge: inboxData || null, badgeAlert: true },
    { href: '/settings', label: 'Settings', icon: Settings, show: isAdmin, badge: null },
  ].filter(item => item.show)

  const initials = (user?.user_metadata?.full_name as string)
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    || user?.email?.[0]?.toUpperCase() || '?'

  return (
    <aside style={{ background: 'var(--navy)', width: 224, flexShrink: 0, height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 32, height: 32, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>Spotlight</div>
          <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,.35)', marginTop: 2 }}>Casting</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ paddingTop: 12, flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'rgba(255,255,255,.25)', padding: '20px 20px 7px' }}>
          Navigation
        </div>
        <nav>
          {navItems.map(({ href, label, icon: Icon, badge, badgeAlert }) => {
            const isActive = location.pathname === href || (href !== '/' && href !== '/dashboard' && location.pathname.startsWith(href))
            return (
              <Link
                key={href}
                to={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 16px', margin: '1px 8px', borderRadius: 8,
                  color: isActive ? '#fff' : 'rgba(255,255,255,.45)',
                  background: isActive ? 'rgba(255,255,255,.1)' : 'transparent',
                  fontWeight: isActive ? 500 : 450,
                  fontSize: 13, textDecoration: 'none',
                  transition: 'background .14s, color .14s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.75)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.45)'
                  }
                }}
              >
                <Icon size={15} style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
                {label}
                {badge != null && badge > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 10, fontWeight: 600,
                    padding: '1px 6px', borderRadius: 99,
                    background: badgeAlert ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.12)',
                    color: badgeAlert ? '#fca5a5' : 'rgba(255,255,255,.6)',
                  }}>
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {isManager && (
          <>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'rgba(255,255,255,.25)', padding: '20px 20px 7px' }}>
              Actions
            </div>
            <Link
              to="/calls/new"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 16px', margin: '1px 8px', borderRadius: 8,
                color: 'rgba(255,255,255,.45)', background: 'transparent',
                fontWeight: 450, fontSize: 13, textDecoration: 'none',
                transition: 'background .14s, color .14s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.06)'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.75)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.45)'
              }}
            >
              <Plus size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
              New Casting Call
            </Link>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, marginBottom: 4, cursor: 'pointer', transition: 'background .14s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#3B4D6B', color: 'rgba(255,255,255,.85)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
              {user?.user_metadata?.full_name || user?.email}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>
              {role ? ROLE_LABELS[role] : 'No role'}
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            color: 'rgba(255,255,255,.35)', background: 'transparent',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background .14s, color .14s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.12)'; e.currentTarget.style.color = '#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}
        >
          <LogOut size={15} style={{ opacity: 0.7 }} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
