/**
 * Convert a string to a URL-friendly slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate the application URL for a casting call
 */
export function getCastingCallUrl(show: string, role: string): string {
  const showSlug = createSlug(show)
  const roleSlug = createSlug(role)
  return `/${showSlug}/${roleSlug}`
}
// ─── Preset tags ──────────────────────────────────────────────────────────────
export const PRESET_TAGS: { name: string; emoji: string; color: string; bg: string }[] = [
  { name: 'top-pick',     emoji: '⭐', color: '#92400E', bg: '#FEF3C7' },
  { name: 'great-energy', emoji: '⚡', color: '#065F46', bg: '#D1FAE5' },
  { name: 'wrong-look',   emoji: '👤', color: '#6B21A8', bg: '#F3E8FF' },
  { name: 'callback',     emoji: '📞', color: '#1E40AF', bg: '#DBEAFE' },
  { name: 'maybe',        emoji: '🤔', color: '#374151', bg: '#F3F4F6' },
  { name: 'not-suitable', emoji: '✗',  color: '#991B1B', bg: '#FEE2E2' },
]
