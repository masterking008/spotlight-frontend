import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutGrid, Megaphone, Users, Inbox, Settings, ArrowRight, X } from 'lucide-react'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

const QUICK_LINKS = [
  { label: 'Overview',       href: '/',                icon: LayoutGrid, hint: 'Dashboard' },
  { label: 'Casting Calls',  href: '/dashboard',       icon: Megaphone,  hint: 'Browse all calls' },
  { label: 'Applications',   href: '/applications',    icon: Users,      hint: 'Review submissions' },
  { label: 'Approver Inbox', href: '/approver/inbox',  icon: Inbox,      hint: 'Pending decks' },
  { label: 'Settings',       href: '/settings',        icon: Settings,   hint: 'Manage workspace' },
]

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, QUICK_LINKS.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (query.trim()) {
          navigate(`/applications?search=${encodeURIComponent(query.trim())}`)
          onClose()
        } else {
          navigate(QUICK_LINKS[active].href)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, query, active, navigate, onClose])

  if (!open) return null

  const goTo = (href: string) => {
    navigate(href)
    onClose()
  }

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/applications?search=${encodeURIComponent(query.trim())}`)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(15, 20, 35, 0.45)',
          backdropFilter: 'blur(3px)',
          animation: 'fadeIn .15s ease',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '22%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          width: 560,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--white)',
          borderRadius: 14,
          border: '1px solid var(--border-2)',
          boxShadow: '0 24px 64px rgba(15,20,35,.18), 0 4px 16px rgba(15,20,35,.08)',
          overflow: 'hidden',
          animation: 'slideDown .16s cubic-bezier(.4,0,.2,1)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Search input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--faint)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search applicants, shows, casting calls…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSearch()
            }}
            style={{
              flex: 1,
              fontSize: 14.5,
              fontFamily: 'inherit',
              color: 'var(--navy)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex', padding: 2 }}
            >
              <X size={14} />
            </button>
          )}
          <kbd style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '2px 6px', borderRadius: 5, fontSize: 11, fontWeight: 500,
            color: 'var(--faint)', background: 'var(--surface)', border: '1px solid var(--border)',
            flexShrink: 0, lineHeight: 1.5,
          }}>
            esc
          </kbd>
        </div>

        {/* Quick links / results */}
        <div style={{ padding: '8px 0' }}>
          {!query ? (
            <>
              <div style={{ padding: '4px 16px 6px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--faint)' }}>
                Quick navigation
              </div>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon
                const isActive = active === i
                return (
                  <button
                    key={link.href}
                    onClick={() => goTo(link.href)}
                    onMouseEnter={() => setActive(i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 16px',
                      background: isActive ? 'var(--surface)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background .1s',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: isActive ? 'var(--white)' : 'var(--surface)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'background .1s',
                    }}>
                      <Icon size={14} style={{ color: isActive ? 'var(--navy)' : 'var(--muted)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>{link.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>{link.hint}</div>
                    </div>
                    <ArrowRight size={13} style={{ color: isActive ? 'var(--muted)' : 'transparent', flexShrink: 0, transition: 'color .1s' }} />
                  </button>
                )
              })}
            </>
          ) : (
            <button
              onClick={handleSearch}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--blue-lt)', border: '1px solid var(--blue-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Search size={14} style={{ color: 'var(--blue)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--navy)' }}>
                  Search for "<span style={{ color: 'var(--blue)' }}>{query}</span>"
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1 }}>In applicants & shows</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <kbd style={{ padding: '2px 6px', borderRadius: 5, fontSize: 11, fontWeight: 500, color: 'var(--muted)', background: 'var(--white)', border: '1px solid var(--border)' }}>↵</kbd>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          {[
            { keys: ['↑', '↓'], label: 'navigate' },
            { keys: ['↵'], label: 'select' },
            { keys: ['esc'], label: 'close' },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {keys.map(k => (
                <kbd key={k} style={{ padding: '1px 5px', borderRadius: 4, fontSize: 10.5, fontWeight: 500, color: 'var(--faint)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {k}
                </kbd>
              ))}
              <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 2 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-10px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
      `}</style>
    </>
  )
}
