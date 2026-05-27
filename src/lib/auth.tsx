import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { profileApi } from './api'
import type { AppRole, UserProfile } from './api'

// Re-export so consumers can import from auth too
export type { AppRole }

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  appRole: AppRole | null
  profile: UserProfile | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // Use React Query for role and profile data
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role'],
    queryFn: () => profileApi.getRole().then(res => res.data),
    enabled: !!session,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      const status = (error as any)?.response?.status
      if (status === 403) return false // Don't retry auth errors
      return failureCount < 1
    },
  })

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => profileApi.getMe().then(res => res.data),
    enabled: !!session && !!roleData?.role,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const appRole = roleData?.role || null
  const profile = profileData || null
  const isDataLoading = loading || (session && (roleLoading || profileLoading))

  const refreshProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['user-role'] })
    queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    return Promise.resolve()
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (!session) {
        // Clear all cached data on sign out
        queryClient.clear()
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  // Handle auth errors
  useEffect(() => {
    if (roleData === undefined && session && !roleLoading) {
      // Role query failed, likely 403
      supabase.auth.signOut()
      window.location.href = '/unauthorized'
    }
  }, [roleData, session, roleLoading])

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading: isDataLoading,
      appRole, profile,
      signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
