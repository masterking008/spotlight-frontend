import { useState, useRef, useCallback } from 'react'
import { Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { uploadVideo, formatBytes, formatETA } from '../lib/upload'

interface VideoUploaderProps {
  applicationId: string | null
  maxSizeMB?: number
  required?: boolean
  onComplete?: (mediaId: string, storagePath: string) => void
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; percent: number; bytesUploaded: number; bytesTotal: number; startTime: number }
  | { phase: 'paused'; percent: number }
  | { phase: 'done'; mediaId: string; filename: string }
  | { phase: 'error'; message: string }

export function VideoUploader({
  applicationId,
  maxSizeMB = 200,
  required = false,
  onComplete,
}: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setState({ phase: 'error', message: 'Please select a video file.' })
      return
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setState({
        phase: 'error',
        message: `Video must be under ${maxSizeMB} MB. This file is ${(file.size / 1024 / 1024).toFixed(0)} MB.`,
      })
      return
    }

    // Warn about large files on mobile
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    if (isMobile && file.size > 100 * 1024 * 1024) {
      // Non-blocking warning — continue
      console.warn('Large video on mobile connection — resumable upload enabled')
    }

    const startTime = Date.now()
    setState({ phase: 'uploading', percent: 0, bytesUploaded: 0, bytesTotal: file.size, startTime })

    try {
      const result = await uploadVideo(
        applicationId,
        file,
        (percent, bytesUploaded, bytesTotal) => {
          setState({ phase: 'uploading', percent, bytesUploaded, bytesTotal, startTime })
        }
      )
      setState({ phase: 'done', mediaId: result.media_id, filename: file.name })
      onComplete?.(result.media_id, result.storage_path)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setState({ phase: 'error', message })
    }
  }, [applicationId, maxSizeMB, onComplete])

  const handleFile = (file: File | null) => {
    if (file) startUpload(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const reset = () => setState({ phase: 'idle' })

  return (
    <div>
      {state.phase === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all
            flex flex-col items-center gap-3 text-center select-none
            ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}
          `}
        >
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Video className="w-7 h-7 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              Tap to add your self-tape
            </p>
            <p className="text-xs text-gray-400 mt-1">
              MP4, MOV, AVI · Max {maxSizeMB} MB · Up to 3 minutes
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Resumable — safe to switch apps or lose connection
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {state.phase === 'uploading' && (
        <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Uploading video...</p>
              <p className="text-xs text-gray-400">
                {formatBytes(state.bytesUploaded)} of {formatBytes(state.bytesTotal)}
                {' · '}
                {formatETA(state.bytesUploaded, state.bytesTotal, state.startTime)}
              </p>
            </div>
            <span className="text-xl font-bold text-blue-600 tabular-nums">{state.percent}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${state.percent}%` }}
            />
          </div>

          <p className="text-xs text-center text-gray-400">
            You can safely close this tab — the upload will resume where it left off
          </p>
        </div>
      )}

      {state.phase === 'done' && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">Video uploaded successfully</p>
            <p className="text-xs text-green-600 truncate">{state.filename}</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-500 hover:text-red-500 underline"
          >
            Replace
          </button>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Upload failed</p>
              <p className="text-xs text-red-600 mt-0.5">{state.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="w-full py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {required && state.phase === 'idle' && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Self-tape video is required
        </p>
      )}
    </div>
  )
}
