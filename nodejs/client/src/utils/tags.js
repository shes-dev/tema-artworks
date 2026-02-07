/** Capitalize first letter of a tag string for display. */
export function formatTagForDisplay(tag) {
  if (tag == null || typeof tag !== 'string') return ''
  const t = tag.trim()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

/** Return a new array of tags sorted A–Z with each tag formatted for display. */
export function sortAndFormatTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...tags]
    .sort((a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' }))
    .map(formatTagForDisplay)
    .filter(Boolean)
}
