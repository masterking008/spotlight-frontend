import { useState, useRef, useCallback } from 'react'
import { X, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { uploadPhoto, formatBytes } from '../lib/upload'

interface PhotoFile {
  id: string
  file: File
  preview: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  media_id?: string
  error?: string
}

interface PhotoUploaderProps {
  applicationId: string | null
  maxFiles?: number
  maxSizeMB?: number
  required?: boolean
  onComplete?: (mediaIds: string[]) => void
}

export function PhotoUploader({
  applicationId,
  maxFiles = 5,
  maxSizeMB = 5,
  required = false,
  onComplete,
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<PhotoFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      const entry: PhotoFile = {
        id: crypto.randomUUID(),
        file,
        preview: '',
        status: 'error',
        progress: 0,
        error: `File too large. Max ${maxSizeMB} MB.`,
      }
      setFiles(prev => [...prev, entry])
      return
    }

    const preview = URL.createObjectURL(file)
    const id = crypto.randomUUID()

    const entry: PhotoFile = { id, file, preview, status: 'uploading', progress: 0 }
    setFiles(prev => [...prev, entry])

    try {
      const result = await uploadPhoto(applicationId, file, (percent) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: percent } : f))
      })
      setFiles(prev => {
        const updated = prev.map(f =>
          f.id === id ? { ...f, status: 'done' as const, progress: 100, media_id: result.media_id } : f
        )
        const doneIds = updated.filter(f => f.status === 'done' && f.media_id).map(f => f.media_id!)
        onComplete?.(doneIds)
        return updated
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'error' as const, error: message } : f
      ))
    }
  }, [applicationId, maxSizeMB, onComplete])

  const handleFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return
    const remaining = maxFiles - files.length
    const toProcess = Array.from(incoming)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remaining)
    toProcess.forEach(processFile)
  }, [files.length, maxFiles, processFile])

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      const doneIds = updated.filter(f => f.status === 'done' && f.media_id).map(f => f.media_id!)
      onComplete?.(doneIds)
      return updated
    })
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const canAddMore = files.length < maxFiles
  const hasError = required && files.length === 0

  return (
    <div className="space-y-3">
      {/* Drop zone — only shown when slots remain */}
      {canAddMore && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all
            flex flex-col items-center gap-2 text-center select-none
            ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}
            ${hasError ? 'border-red-300 bg-red-50' : ''}
          `}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Image className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Tap to add photos
              <span className="text-gray-400 font-normal"> or drag & drop</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              JPG, PNG, WEBP · Max {maxSizeMB} MB each · {files.length}/{maxFiles} uploaded
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Uploaded files grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
              {f.preview && (
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Status overlay */}
              {f.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span className="text-white text-xs font-medium">{f.progress}%</span>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <div
                      className="h-full bg-blue-400 transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {f.status === 'done' && (
                <div className="absolute top-1 left-1">
                  <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                </div>
              )}

              {f.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center p-2 gap-1">
                  <AlertCircle className="w-5 h-5 text-red-300" />
                  <span className="text-red-200 text-[10px] text-center leading-tight">{f.error}</span>
                </div>
              )}

              {/* Remove button */}
              {f.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}

              {/* File size label */}
              <div className="absolute bottom-1 right-1 text-[10px] text-white/80 bg-black/40 px-1 rounded">
                {formatBytes(f.file.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasError && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> At least one photo is required
        </p>
      )}
    </div>
  )
}
