import { useState, useRef } from 'react'
import { Play, Loader2, AlertCircle } from 'lucide-react'

interface InlineVideoPlayerProps {
  src: string
  posterUrl?: string
  applicantName?: string
  className?: string
}

export function InlineVideoPlayer({ src, posterUrl, applicantName, className = '' }: InlineVideoPlayerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlay = () => {
    setLoading(true)
    setPlaying(true)
    videoRef.current?.play().catch(() => setError(true))
  }

  if (error) {
    return (
      <div className={`bg-gray-100 rounded-lg flex flex-col items-center justify-center gap-2 aspect-video ${className}`}>
        <AlertCircle className="w-6 h-6 text-gray-400" />
        <p className="text-xs text-gray-500">Video unavailable</p>
      </div>
    )
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden aspect-video group ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={posterUrl}
        controls={playing}
        preload="metadata"
        crossOrigin="anonymous"
        className="w-full h-full object-contain"
        onLoadedData={() => setLoading(false)}
        onError={() => setError(true)}
        onPlay={() => setLoading(false)}
        playsInline
      />

      {/* Play overlay — shown before first play */}
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all hover:scale-105">
            <Play className="w-6 h-6 text-gray-800 ml-1" />
          </div>
          {applicantName && (
            <span className="text-white text-xs font-medium drop-shadow">
              {applicantName}'s self-tape
            </span>
          )}
        </button>
      )}

      {/* Loading spinner */}
      {loading && playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
    </div>
  )
}
