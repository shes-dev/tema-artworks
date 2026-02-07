import { sortAndFormatTags } from '../../utils/tags'

export default function ArtworkDetails({ artwork, children }) {
  if (!artwork?.normalized) return null
  const n = artwork.normalized
  const displayTags = sortAndFormatTags(n.tags ?? [])
  return (
    <div className="flex flex-col">
      {/* ModalContent: ImageSection + MetaSection */}
      {/* ImageSection: bottom margin 32px; image max-h 60vh, centered, never touch edges */}
      {n.images?.primary && (
        <div className="mb-8 flex justify-center bg-neutral-100 rounded-lg overflow-hidden p-1.5">
          <img
            src={n.images.primary}
            alt=""
            className="max-h-[60vh] w-auto object-contain"
          />
        </div>
      )}
      {/* MetaSection: Title, Artist, Medium, Department, Tags, Actions */}
      <div className="flex flex-col text-left">
        <h3 className="text-2xl font-bold text-neutral-900 leading-tight truncate" title={n.title ?? 'Untitled'}>
          {n.title ?? 'Untitled'}
        </h3>
        {n.artistName && (
          <p className="mt-2 text-base font-medium text-neutral-700">{n.artistName}</p>
        )}
        <div className="mt-1.5 space-y-0.5">
          {n.medium && (
            <p className="text-sm text-neutral-500">{n.medium}</p>
          )}
          {n.classification && (
            <p className="text-sm text-neutral-500">{n.classification}</p>
          )}
        </div>
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          {children}
        </div>
      </div>
    </div>
  )
}
