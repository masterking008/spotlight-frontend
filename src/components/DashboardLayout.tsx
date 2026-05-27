import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from './NotificationBell'
import { SearchModal } from './SearchModal'
import { useAuth } from '../lib/auth'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { user } = useAuth()

  const initials = (user?.user_metadata?.full_name as string)
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    || user?.email?.[0]?.toUpperCase() || '?'

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <div
          className="h-[52px] flex items-center px-7 gap-3 shrink-0"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
        >
          {title && (
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.2px' }}>{title}</span>
          )}

          <div className="ml-auto flex items-center gap-2">

            {/* Search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: 210,
                padding: '6px 10px',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'var(--faint)',
                fontSize: 12.5,
                transition: 'border-color .15s, box-shadow .15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <Search size={13} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Search…</span>
              <kbd style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                padding: '1px 5px',
                borderRadius: 5,
                fontSize: 10.5,
                fontWeight: 500,
                color: 'var(--faint)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                lineHeight: 1.6,
                flexShrink: 0,
              }}>
                ⌘K
              </kbd>
            </button>

            <NotificationBell />

            {/* Profile avatar */}
            <div
              className="flex items-center justify-center cursor-pointer"
              style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--navy)', color: 'rgba(255,255,255,.85)', fontSize: 11, fontWeight: 600 }}
              title={user?.user_metadata?.full_name || user?.email}
            >
              {initials}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </main>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
