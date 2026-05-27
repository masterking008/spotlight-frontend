import { useAuth } from '../lib/auth'

export function useRole() {
  const { appRole } = useAuth()
  return {
    role: appRole,
    isAdmin: appRole === 'admin',
    isManager: appRole === 'casting_manager' || appRole === 'admin',
    isApprover: appRole === 'approver' || appRole === 'admin',
    isViewer: !!appRole,
    hasRole: (r: string) => appRole === r || appRole === 'admin',
  }
}
