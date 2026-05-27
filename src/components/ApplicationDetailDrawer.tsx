import { useState, useEffect, useCallback } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import {
  X, Plus, ChevronRight, Save,
  Phone, Mail, MapPin, Languages, Calendar, Hash,
  CheckCircle2, Clock, Star, XCircle,
} from 'lucide-react'
import { applicationsApi } from '../lib/api'
import type { Application, ApplicationTag } from '../lib/api'
import { InlineVideoPlayer } from './InlineVideoPlayer'
import { successToast, errorToast } from '../lib/swal'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new:         { label: 'New', color: 'bg-blue-100 text-blue-700',      icon: <Clock className="w-3 h-3" /> },
  reviewing:   { label: 'Reviewing', color: 'bg-yellow-100 text-yellow-700', icon: <Star className="w-3 h-3" /> },
  shortlisted: { label: 'Shortlisted', color: 'bg-purple-100 text-purple-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  pitched:     { label: 'Pitched', color: 'bg-orange-100 text-orange-700', icon: <ChevronRight className="w-3 h-3" /> },
  approved:    { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  cast:        { label: 'Cast', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:    { label: 'Rejected', color: 'bg-red-100 text-red-700',     icon: <XCircle className="w-3 h-3" /> },
}

const STATUS_ORDER = ['new', 'reviewing', 'shortlisted', 'pitched', 'approved', 'cast', 'rejected']

interface ApplicationDetailDrawerProps {
  application: Application | null
  castingCallId: number
  onClose: () => void
}

export function ApplicationDetailDrawer({ application, castingCallId, onClose }: ApplicationDetailDrawerProps) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState(application?.notes || '')
  const [notesDirty, setNotesDirty] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  useEffect(() => {
    setNotes(application?.notes || '')
    setNotesDirty(false)
  }, [application?.id])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications', castingCallId] })
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) => applicationsApi.updateStatus(application!.id, status),
    onSuccess: (_data, status) => {
      invalidate()
      successToast(`Status updated to ${STATUS_CONFIG[status]?.label ?? status}`)
    },
    onError: () => errorToast('Failed to update status'),
  })

  const notesMutation = useMutation({
    mutationFn: (n: string) => applicationsApi.updateNotes(application!.id, n),
    onSuccess: () => { setNotesDirty(false); invalidate(); successToast('Notes saved') },
    onError: () => errorToast('Failed to save notes'),
  })

  const addTagMutation = useMutation({
    mutationFn: (tag: string) => applicationsApi.addTag(application!.id, tag),
    onSuccess: (_data, tag) => { setNewTag(''); setAddingTag(false); invalidate(); successToast(`Tag "${tag}" added`) },
    onError: () => errorToast('Failed to add tag'),
  })

  const removeTagMutation = useMutation({
    mutationFn: (tag: string) => applicationsApi.removeTag(application!.id, tag),
    onSuccess: invalidate,
    onError: () => errorToast('Failed to remove tag'),
  })

  const saveNotes = useCallback(() => {
    if (notesDirty) notesMutation.mutate(notes)
  }, [notes, notesDirty, notesMutation])

  if (!application) return null

  const { applicant, tags = [], media = [], custom_responses } = application
  const photos = media.filter(m => m.type === 'photo' && m.url)
  const videos = media.filter(m => m.type === 'video' && m.url)

  const statusCfg = STATUS_CONFIG[application.status] || STATUS_CONFIG.new

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {applicant?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{applicant?.name}</p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                {statusCfg.icon}
                {statusCfg.label}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* Status pipeline */}
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => statusMutation.mutate(s)}
                  disabled={statusMutation.isPending}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    application.status === s
                      ? STATUS_CONFIG[s]?.color + ' ring-1 ring-current ring-offset-1'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Applicant info */}
          <div className="px-5 py-4 border-b border-gray-50 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</p>
            {applicant?.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-300 shrink-0" />
                {applicant.phone}
              </div>
            )}
            {applicant?.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-300 shrink-0" />
                {applicant.email}
              </div>
            )}
            {applicant?.city && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                {applicant.city}{applicant.age ? `, ${applicant.age} yrs` : ''}
              </div>
            )}
            {applicant?.languages && applicant.languages.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Languages className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                <span>{applicant.languages.join(', ')}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4 shrink-0" />
              Applied {new Date(application.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Hash className="w-4 h-4 shrink-0" />
              <span className="font-mono">{application.tracking_id}</span>
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photos</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhoto(photo.url!)}
                    className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 border-transparent hover:border-blue-400 transition-all"
                  >
                    <img src={photo.url!} alt="Applicant photo" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Self-tape</p>
              <div className="space-y-2">
                {videos.map((video) => (
                  <InlineVideoPlayer
                    key={video.id}
                    src={video.url!}
                    applicantName={applicant?.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom responses */}
          {custom_responses && Object.keys(custom_responses).length > 0 && (
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Responses</p>
              <div className="space-y-3">
                {Object.entries(custom_responses).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 mb-0.5 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-800">
                      {Array.isArray(val) ? val.join(', ') : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: ApplicationTag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium group"
                >
                  {tag.tag_name}
                  <button
                    type="button"
                    onClick={() => removeTagMutation.mutate(tag.tag_name)}
                    className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {addingTag ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newTag.trim()) addTagMutation.mutate(newTag.trim().toLowerCase())
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    autoFocus
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="tag name"
                    className="w-24 px-2 py-1 text-xs border border-blue-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-400"
                    onKeyDown={(e) => e.key === 'Escape' && setAddingTag(false)}
                  />
                  <button type="submit" className="text-blue-600 hover:text-blue-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setAddingTag(false)} className="text-gray-400">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-dashed border-gray-300 text-gray-400 rounded-lg text-xs hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add tag
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reviewer notes</p>
              {notesDirty && (
                <button
                  type="button"
                  onClick={saveNotes}
                  disabled={notesMutation.isPending}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <Save className="w-3 h-3" />
                  {notesMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesDirty(true) }}
              onBlur={saveNotes}
              placeholder="Internal notes visible only to the casting team..."
              rows={4}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Photo lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img src={selectedPhoto} alt="Full size" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  )
}
