import { useEffect, useRef, useCallback } from 'react'

/**
 * Production-safe autosave hook.
 *
 * Accepts a `getSnapshot` callback instead of reactive data so saves run on
 * their own interval without subscribing to React renders. This prevents the
 * bug where every keystroke → re-render → getSaved gets new reference →
 * loadSavedData gets new reference → useEffect fires → reset() wipes the form.
 *
 * getSaved and clearSaved are stable references (useCallback keyed on `key`)
 * so they're safe in dependency arrays.
 */
export function useAutosave<T>(
  key: string,
  getSnapshot: () => T,
  delay: number = 2000,
  disabled: boolean = false,
) {
  // Always keep a ref to the latest snapshot function without restarting the interval
  const getSnapshotRef = useRef(getSnapshot)
  useEffect(() => { getSnapshotRef.current = getSnapshot })

  const lastSavedRef = useRef<string | undefined>()

  // Interval-based save: completely decoupled from React render cycle
  useEffect(() => {
    if (!key || disabled) return
    const id = setInterval(() => {
      try {
        const snap = JSON.stringify(getSnapshotRef.current())
        if (snap !== lastSavedRef.current) {
          localStorage.setItem(key, snap)
          lastSavedRef.current = snap
        }
      } catch {
        // localStorage unavailable or quota exceeded — ignore silently
      }
    }, delay)
    return () => clearInterval(id)
  }, [key, delay, disabled])

  const getSaved = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }, [key])

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key)
      lastSavedRef.current = undefined
    } catch {
      // ignore
    }
  }, [key])

  return { getSaved, clearSaved }
}
