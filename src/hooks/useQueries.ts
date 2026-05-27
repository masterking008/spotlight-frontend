import { useQuery } from '@tanstack/react-query'
import {
  overviewApi,
  castingCallsApi,
  pitchDecksApi, 
  notificationsApi,
  applicationsApi 
} from '../lib/api'
import { useAuth } from '../lib/auth'

// Centralized query keys to prevent duplication
export const queryKeys = {
  overview: ['overview'] as const,
  castingCalls: ['casting-calls'] as const,
  applications: (filters?: Record<string, any>) => ['applications', filters] as const,
  recentApplications: (callId?: number) => ['recent-apps', callId] as const,
  approverInbox: ['approver-inbox'] as const,
  notifications: (skip = 0, limit = 30) => ['notifications', skip, limit] as const,
  notificationsFeed: ['notifications-feed'] as const,
  unreadCount: ['notifications-unread-count'] as const,
}

// Common stale time for most queries
const DEFAULT_STALE_TIME = 2 * 60 * 1000 // 2 minutes

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => overviewApi.getOverview().then(r => r.data),
    staleTime: DEFAULT_STALE_TIME,
    refetchInterval: 60_000, // Refresh every minute
  })
}

export function useCastingCalls() {
  return useQuery({
    queryKey: queryKeys.castingCalls,
    queryFn: () => castingCallsApi.getAll().then(r => r.data),
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useRecentApplications(callId?: number) {
  return useQuery({
    queryKey: queryKeys.recentApplications(callId),
    queryFn: () => castingCallsApi.getApplications(callId!, { 
      page_size: 5, 
      sort: 'submitted_at_desc' 
    }).then(r => r.data),
    enabled: !!callId,
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useApproverInbox() {
  const { appRole } = useAuth()
  const isApprover = appRole === 'approver' || appRole === 'admin'
  
  return useQuery({
    queryKey: queryKeys.approverInbox,
    queryFn: () => pitchDecksApi.getApproverInbox().then(r => r.data),
    enabled: isApprover,
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useNotifications(skip = 0, limit = 30) {
  return useQuery({
    queryKey: queryKeys.notifications(skip, limit),
    queryFn: () => notificationsApi.getAll(skip, limit).then(r => r.data),
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useNotificationsFeed() {
  return useQuery({
    queryKey: queryKeys.notificationsFeed,
    queryFn: () => notificationsApi.getAll(0, 6).then(r => r.data),
    staleTime: DEFAULT_STALE_TIME,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => notificationsApi.getUnreadCount().then(r => r.data.count),
    staleTime: 30_000, // 30 seconds for real-time feel
    refetchInterval: 30_000,
  })
}

export function useApplications(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.applications(filters),
    queryFn: () => applicationsApi.getAll(filters).then(r => r.data),
    enabled: !!filters,
    staleTime: DEFAULT_STALE_TIME,
  })
}