import { useState, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react'
import { bannerApi } from '../lib/api'

// Fixed banner aspect ratio: 4:1 (wide cinematic banner)
const ASPECT = 4 / 1
const BANNER_W = 1200
const BANNER_H = 300

async function getCroppedBlob(imageSrc: string, croppedArea: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = imageSrc
  })
  const canvas = document.createElement('canvas')
  canvas.width = BANNER_W
  canvas.height = BANNER_H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    img,
    croppedArea.x, croppedArea.y, croppedArea.width, croppedArea.height,
    0, 0, BANNER_W, BANNER_H,
  )
  return new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('canvas empty')), 'image/jpeg', 0.92)
  )
}

interface Props {
  value?: string        // current banner URL
  onChange: (url: string) => void
}

export function BannerCropper({ value, onChange }: Props) {
  const [src, setSrc] = useState<string | null>(null)   // raw file preview for cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setSrc(reader.result as string)
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  const handleUpload = async () => {
    if (!src || !croppedArea) return
    setUploading(true)
    setError('')
    try {
      const blob = await getCroppedBlob(src, croppedArea)
      const file = new File([blob], 'banner.jpg', { type: 'image/jpeg' })
      const res = await bannerApi.upload(file)
      onChange(res.data.url)
      setSrc(null)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onChange('')
    setSrc(null)
  }

  // ── Cropper modal ───────────────────────────────────────────────────────────
  if (src) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', width: '100%', height: 220, background: '#111', borderRadius: 10, overflow: 'hidden' }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Zoom</span>
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--navy)' }}
          />
          <button
            type="button"
            onClick={() => setSrc(null)}
            style={{ padding: '6px 12px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            style={{
              padding: '6px 16px', background: 'var(--navy)', color: '#fff',
              border: 'none', borderRadius: 7, fontSize: 12.5, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            }}
          >
            {uploading ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 13, height: 13 }} />}
            {uploading ? 'Uploading…' : 'Use this crop'}
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: 'var(--rose)' }}>{error}</p>}
      </div>
    )
  }

  // ── Preview / empty state ───────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {value ? (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img src={value} alt="Banner" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              style={{ padding: '5px 10px', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Upload style={{ width: 12, height: 12 }} /> Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              style={{ padding: '5px 8px', background: 'rgba(239,68,68,.7)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', height: 100,
            border: '1.5px dashed var(--border)', borderRadius: 10,
            background: 'var(--surface)', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#93C5FD')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ImageIcon style={{ width: 22, height: 22, color: 'var(--faint)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>Upload banner image</span>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>Recommended 1200 × 300 px · JPEG / PNG · max 8 MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFileChange} />
    </div>
  )
}
