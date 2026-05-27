import * as tus from 'tus-js-client'
import { mediaApi } from './api'

export type UploadProgressCallback = (percent: number, bytesUploaded: number, bytesTotal: number) => void

// ─── Photo Upload ─────────────────────────────────────────────────────────────

export async function uploadPhoto(
  applicationId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<{ url: string; storage_path: string; media_id: string }> {
  // 1. Get signed upload URL from our backend
  const { data } = await mediaApi.getPhotoUploadUrl(applicationId, file.name, file.size)
  const { signed_url, session_id, storage_path } = data

  // 2. PUT the file directly to Supabase Storage (not through our server)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signed_url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100), e.loaded, e.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })

  // 3. Tell backend the upload is done so it creates the DB record
  const { data: media } = await mediaApi.completeUpload(applicationId, session_id, storage_path, 'photo')
  return { url: media.url || '', storage_path: media.storage_path || '', media_id: media.id }
}

// ─── Video Upload (TUS resumable) ─────────────────────────────────────────────

// Use size+lastModified as identifier — avoids spaces/special chars in localStorage keys
const RESUME_STORAGE_KEY = (file: File) =>
  `tus_upload_${file.size}_${file.lastModified}`

export interface VideoUploadHandle {
  abort: () => void
  pause: () => void
  resume: () => void
}

export async function uploadVideo(
  applicationId: string,
  file: File,
  onProgress?: UploadProgressCallback,
  _onPaused?: () => void,
  _onResumed?: () => void
): Promise<{ storage_path: string; media_id: string }> {
  // 1. Get TUS endpoint + path-scoped upload token from the backend.
  //    The token was signed with the service-role key so it bypasses bucket RLS.
  const { data } = await mediaApi.getVideoUploadUrl(applicationId, file.name, file.size)
  const { session_id, tus_endpoint, upload_token, bucket, storage_path } = data

  // Check for a saved upload URL (resume after page refresh / network drop)
  const savedUrl = localStorage.getItem(RESUME_STORAGE_KEY(file))

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: tus_endpoint,            // POST here to create a new upload slot
      uploadUrl: savedUrl || undefined,  // resume from saved URL if available
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024, // 6 MB — Supabase Storage TUS chunk limit
      metadata: {
        bucketName: bucket,
        objectName: storage_path,
        contentType: file.type || 'video/mp4',
        cacheControl: '3600',
      },
      headers: {
        // Path-scoped JWT signed by service-role — bypasses RLS without exposing
        // the service key itself. Generated fresh per upload in the backend.
        Authorization: `Bearer ${upload_token}`,
        'x-upsert': 'true',
      },
      onProgress(bytesUploaded, bytesTotal) {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100)
        onProgress?.(percent, bytesUploaded, bytesTotal)
      },
      onSuccess: async () => {
        // Clean up saved URL
        localStorage.removeItem(RESUME_STORAGE_KEY(file))

        // Tell backend upload is complete
        try {
          const { data: media } = await mediaApi.completeUpload(
            applicationId, session_id, storage_path, 'video'
          )
          resolve({ storage_path: media.storage_path || '', media_id: media.id })
        } catch (err) {
          reject(err)
        }
      },
      onError(error) {
        reject(error)
      },
      onShouldRetry(error) {
        const status = (error as tus.DetailedError).originalResponse?.getStatus?.() ?? 0
        return status !== 403 // don't retry auth errors
      },
      onChunkComplete(_chunkSize, _bytesAccepted) {
        // Save upload URL for resume capability
        if (upload.url) {
          localStorage.setItem(RESUME_STORAGE_KEY(file), upload.url)
        }
      },
    })

    // Check for existing uploads to resume
    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0])
      }
      upload.start()
    })
  })
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatETA(bytesUploaded: number, bytesTotal: number, startTime: number): string {
  const elapsed = (Date.now() - startTime) / 1000
  const rate = bytesUploaded / elapsed
  if (rate === 0) return 'Calculating...'
  const remaining = (bytesTotal - bytesUploaded) / rate
  if (remaining < 60) return `${Math.ceil(remaining)}s remaining`
  return `${Math.ceil(remaining / 60)}m remaining`
}
