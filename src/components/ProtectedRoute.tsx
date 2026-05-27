import { useAuth } from '../lib/auth'
import { Navigate, useLocation } from 'react-router-dom'
import { Skeleton } from './ui/skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function AuthSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar skeleton */}
      <div className="w-56 shrink-0 h-screen p-4 space-y-2" style={{ background: 'var(--navy)' }}>
        <Skeleton height={32} borderRadius={8} baseColor="#2D3748" highlightColor="#3B4D6B" className="mb-6" />
        {[1,2,3,4].map(i => <Skeleton key={i} height={32} borderRadius={8} baseColor="#2D3748" highlightColor="#3B4D6B" />)}
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-7 space-y-4">
        <Skeleton height={28} width={200} />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} height={120} borderRadius={12} />)}
        </div>
        <Skeleton height={200} borderRadius={12} />
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSkeleton />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}