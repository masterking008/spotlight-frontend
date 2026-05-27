import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Skeleton } from '../components/ui/skeleton'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/')
      } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        navigate('/login?error=auth_callback_failed')
      }
    })

    // Also check if session already exists (e.g. page refresh on callback URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/')
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center space-y-3">
        <Skeleton circle height={40} width={40} style={{ display: 'block', margin: '0 auto' }} />
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Completing sign in…</p>
      </div>
    </div>
  )
}