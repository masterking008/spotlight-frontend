import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Inject Supabase JWT on every authenticated request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) window.location.href = '/unauthorized'
    return Promise.reject(err)
  }
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Collaborator {
  id: string
  email: string
  full_name?: string
}

export interface CastingCall {
  id: string
  title: string
  show: string
  role: string
  description?: string
  deadline?: string
  status: 'draft' | 'open' | 'closed'
  owner_id: string
  collaborators?: Collaborator[]
  form_schema?: FormSchema
  banner_url?: string
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'multiselect' | 'date' | 'file' | 'checkbox'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: { min?: number; max?: number; minLength?: number; maxLength?: number }
  mediaType?: 'photo' | 'video'
  maxFiles?: number
  maxSizeMB?: number
}

export interface FormSchema {
  version: 1
  fields: FormField[]
  settings?: {
    requireConsent?: boolean
    consentText?: string
    allowMultipleSubmissions?: boolean
  }
}

export interface Applicant {
  id: string
  phone: string
  name: string
  email?: string
  age?: number
  city?: string
  languages?: string[]
  profile_data?: Record<string, unknown>
  created_at: string
}

export interface ApplicationMedia {
  id: string
  application_id: string
  type: 'photo' | 'video'
  url?: string
  storage_path?: string
  filename?: string
  file_size?: number
  duration?: number
  thumbnail_url?: string
  upload_status: string
  uploaded_at: string
}

export interface ApplicationTag {
  id: string
  application_id: string
  tag_name: string
  applied_by: string
  applied_at: string
}

export interface Application {
  id: string
  casting_call_id: string
  applicant_id: string
  status: ApplicationStatus
  tracking_id: string
  consent_given: boolean
  notes?: string
  submitted_at: string
  updated_at: string
  custom_responses?: Record<string, unknown>
  applicant?: Applicant
  tags?: ApplicationTag[]
  media?: ApplicationMedia[]
}

export type ApplicationStatus =
  | 'new' | 'reviewing' | 'shortlisted' | 'pitched' | 'approved' | 'cast' | 'rejected'

export interface ApplicationCreate {
  casting_call_id: string
  applicant: {
    phone: string
    name: string
    email?: string
    age?: number
    city?: string
    languages?: string[]
  }
  custom_responses?: Record<string, unknown>
  consent_given: boolean
  phone_token?: string
}

export interface PitchDeckFinalist {
  id: string
  deck_id: string
  application_id: string
  position: number
  manager_notes?: string
  approver_verdict?: 'approved' | 'rejected' | 'pending'
  approver_notes?: string
  application?: Application
}

export interface PitchDeck {
  id: string
  casting_call_id: string
  created_by: string
  title: string
  notes?: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested'
  submitted_at?: string
  reviewed_at?: string
  reviewer_id?: string
  reviewer_notes?: string
  created_at: string
  updated_at: string
  finalists: PitchDeckFinalist[]
}

export interface InAppNotification {
  id: string
  user_id: string
  title: string
  body?: string
  link?: string
  read: boolean
  created_at: string
}

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  performed_by: string
  previous_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  created_at: string
}

export interface StatusResponse {
  status: string
  application_id: string
  tracking_id: string
  casting_call?: {
    title: string
    show: string
    role: string
  }
  submitted_at: string
  last_updated: string
}

export type AppRole = 'admin' | 'casting_manager' | 'approver' | 'viewer'

export interface UserProfile {
  id: string                    // Supabase UUID
  email: string
  full_name?: string
  role: AppRole
  team?: string
  sub_team?: string
  designation?: string
  location?: string
  is_active: boolean
  employee_id?: string
  mobile?: string
  manager_id?: string
  manager_email?: string
  manager_name?: string
  created_at: string
  updated_at?: string
}

export interface UserProfileUpdate {
  full_name?: string
  team?: string
  sub_team?: string
  designation?: string
  location?: string
  mobile?: string
  employee_id?: string
  manager_id?: string
  manager_email?: string
  manager_name?: string
  is_active?: boolean           // admin only
}

export interface ApplicationFilters {
  status?: string
  tags?: string
  search?: string
  sort?: string
  page?: number
  page_size?: number
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const castingCallsApi = {
  getAll: () => api.get<CastingCall[]>('/casting-calls'),
  getById: (id: string) => api.get<CastingCall>(`/casting-calls/${id}`),
  getPublic: (id: string) => api.get<Omit<CastingCall, 'owner_id' | 'created_at' | 'updated_at'>>(`/casting-calls/${id}/public`),
  getBySlug: (showSlug: string, roleSlug: string) => api.get<Omit<CastingCall, 'owner_id' | 'created_at' | 'updated_at'>>(`/casting-calls/by-slug/${showSlug}/${roleSlug}`),
  create: (data: Partial<CastingCall>) => api.post<CastingCall>('/casting-calls', data),
  update: (id: string, data: Partial<CastingCall>) => api.put<CastingCall>(`/casting-calls/${id}`, data),
  getApplications: (id: string, filters?: ApplicationFilters) =>
    api.get<Application[]>(`/casting-calls/${id}/applications`, { params: filters }),
  getShortlisted: (id: string) => api.get<Application[]>(`/casting-calls/${id}/shortlisted`),
  getPitchDecks: (id: string) => api.get<PitchDeck[]>(`/casting-calls/${id}/pitch-decks`),
  addCollaborator: (id: string, userId: string) =>
    api.post<CastingCall>(`/casting-calls/${id}/collaborators`, { user_id: userId }),
  removeCollaborator: (id: string, userId: string) =>
    api.delete<CastingCall>(`/casting-calls/${id}/collaborators/${userId}`),
}

export const applicationsApi = {
  getAll: (params?: { search?: string; status?: string; tags?: string; casting_call_id?: string; sort?: string; page?: number; page_size?: number }) =>
    api.get<Application[]>('/applications', { params }),
  getByCastingCall: (id: string, filters?: ApplicationFilters) =>
    api.get<Application[]>(`/casting-calls/${id}/applications`, { params: filters }),
  searchGlobal: (q: string, page = 1, page_size = 50) =>
    api.get<Application[]>('/applications/search', { params: { q, page, page_size } }),
  submit: (data: ApplicationCreate) => api.post<Application>('/applications', data),
  getById: (id: string) => api.get<Application>(`/applications/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/applications/${id}/status`, { status }),
  updateNotes: (id: string, notes: string) =>
    api.patch(`/applications/${id}/notes`, { notes }),
  checkStatus: (data: { phone_token: string; tracking_id: string }) =>
    api.post('/applications/check-status', data),
  complete: (id: string) =>
    api.post<Application>(`/applications/${id}/complete`),
  addTag: (id: string, tag_name: string) =>
    api.post<ApplicationTag>(`/applications/${id}/tags`, { tag_name }),
  getTags: (id: string) => api.get<ApplicationTag[]>(`/applications/${id}/tags`),
  removeTag: (id: string, tag_name: string) =>
    api.delete(`/applications/${id}/tags/${tag_name}`),
  getMedia: (id: string) => api.get<ApplicationMedia[]>(`/applications/${id}/media`),
  deleteMedia: (id: string, mediaId: string) =>
    api.delete(`/applications/${id}/media/${mediaId}`),
  getAuditLog: (id: string) => api.get<AuditLogEntry[]>(`/applications/${id}/audit-log`),
}

export const mediaApi = {
  getPhotoUploadUrl: (applicationId: string, filename: string, fileSize: number) =>
    api.post(`/applications/${applicationId}/media/photo-upload-url`, {
      filename,
      file_size: fileSize,
      media_type: 'photo',
    }),
  getVideoUploadUrl: (applicationId: string, filename: string, fileSize: number) =>
    api.post(`/applications/${applicationId}/media/video-upload-url`, {
      filename,
      file_size: fileSize,
      media_type: 'video',
    }),
  completeUpload: (applicationId: string, sessionId: string, storagePath: string, mediaType: string) =>
    api.post<ApplicationMedia>(`/applications/${applicationId}/media/complete`, {
      session_id: sessionId,
      storage_path: storagePath,
      media_type: mediaType,
    }),
}

export const otpApi = {
  send: (phone: string, purpose: string) => api.post('/otp/send', { phone, purpose }),
  verify: (phone: string, otp: string, purpose: string) =>
    api.post<{ phone_token: string }>('/otp/verify', { phone, otp, purpose }),
}

export const pitchDecksApi = {
  create: (data: { casting_call_id: string; title: string; notes?: string }) =>
    api.post<PitchDeck>('/pitch-decks', data),
  getById: (id: string) => api.get<PitchDeck>(`/pitch-decks/${id}`),
  update: (id: string, data: { title?: string; notes?: string }) =>
    api.put<PitchDeck>(`/pitch-decks/${id}`, data),
  addFinalist: (deckId: string, data: { application_id: string; position: number; manager_notes?: string }) =>
    api.post<PitchDeckFinalist>(`/pitch-decks/${deckId}/finalists`, data),
  updateFinalist: (deckId: string, finalistId: string, data: { position?: number; manager_notes?: string }) =>
    api.put<PitchDeckFinalist>(`/pitch-decks/${deckId}/finalists/${finalistId}`, data),
  removeFinalist: (deckId: string, finalistId: string) =>
    api.delete(`/pitch-decks/${deckId}/finalists/${finalistId}`),
  submit: (deckId: string) => api.post(`/pitch-decks/${deckId}/submit`),
  approve: (deckId: string, notes?: string) => api.post(`/pitch-decks/${deckId}/approve`, { notes }),
  reject: (deckId: string, notes?: string) => api.post(`/pitch-decks/${deckId}/reject`, { notes }),
  requestChanges: (deckId: string, notes: string) =>
    api.post(`/pitch-decks/${deckId}/request-changes`, { notes }),
  setFinalistVerdict: (deckId: string, finalistId: string, verdict: string, notes?: string) =>
    api.put<PitchDeckFinalist>(`/pitch-decks/${deckId}/finalists/${finalistId}/verdict`, { verdict, notes }),
  getAuditLog: (deckId: string) => api.get<AuditLogEntry[]>(`/pitch-decks/${deckId}/audit-log`),
  getApproverInbox: () => api.get<PitchDeck[]>('/approver/inbox'),
}

export const notificationsApi = {
  getAll: (skip = 0, limit = 30) =>
    api.get<InAppNotification[]>('/notifications', { params: { skip, limit } }),
  getUnreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export const overviewApi = {
  getOverview: () => api.get('/overview'),
}

export const bannerApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string; path: string }>('/casting-calls/banner-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const aiApi = {
  fillCastingCall: (brief: string, file?: File) => {
    const form = new FormData()
    form.append('brief', brief)
    if (file) form.append('file', file)
    return api.post<{
      title: string
      show: string
      role: string
      description: string
      deadline: string
      status: 'open' | 'draft' | 'closed'
      form_schema: FormSchema
    }>('/ai/fill-casting-call', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const adminApi = {
  listUsers: (activeOnly = false) =>
    api.get<UserProfile[]>('/admin/users', { params: { active_only: activeOnly } }),
  getUser: (userId: string) =>
    api.get<UserProfile>(`/admin/users/${userId}`),
  setRole: (userId: string, role: AppRole) =>
    api.put<UserProfile>(`/admin/users/${userId}/role`, { role }),
  updateProfile: (userId: string, data: UserProfileUpdate) =>
    api.patch<UserProfile>(`/admin/users/${userId}`, data),
}

// Lightweight user search for collaborator picker — returns active casting_managers + admins
export const usersApi = {
  searchManagers: () =>
    api.get<UserProfile[]>('/admin/users', { params: { active_only: true } }),
}

export const profileApi = {
  getMe: () => api.get<UserProfile>('/me/profile'),
  updateMe: (data: UserProfileUpdate) => api.patch<UserProfile>('/me/profile', data),
  getRole: () => api.get<{ role: AppRole | null; id: string; email: string; full_name?: string }>('/me/role'),
}
