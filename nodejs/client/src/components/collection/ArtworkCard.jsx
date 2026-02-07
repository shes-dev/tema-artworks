import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { sortAndFormatTags } from '../../utils/tags'

export default function ArtworkCard({ item, onClick }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const normalized = item.normalized ?? {}
  const title = normalized.title ?? `Artwork ${item.sourceObjectId}`
  const thumbnail = normalized.images?.primary
  const tags = normalized.tags ?? []
  const displayTags = sortAndFormatTags(tags)
  const artist = normalized.artistName ?? ''
  const medium = normalized.medium ?? ''
  const descriptionParts = [artist, medium].filter(Boolean)
  const description = descriptionParts.length > 0
    ? descriptionParts.join(' · ')
    : displayTags.length > 0
      ? displayTags.slice(0, 5).join(', ') + (displayTags.length > 5 ? '…' : '')
      : null

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="block w-full max-w-[280px] text-left p-0 border border-neutral-200 rounded-lg overflow-hidden cursor-pointer bg-white hover:border-neutral-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 transition-shadow"
    >
      <div className="aspect-[4/3] bg-neutral-100 relative">
        {thumbnail ? (
          <>
            {!imageLoaded && (
              <span className="absolute inset-0 flex items-center justify-center text-neutral-400" aria-hidden>
                <Loader2 className="h-8 w-8 animate-spin" />
              </span>
            )}
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <span className="flex items-center justify-center h-full text-neutral-400 text-sm">No image</span>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-neutral-900 mb-1 line-clamp-2">{title}</div>
        {description && (
          <div className="text-sm text-neutral-600 line-clamp-2">
            {description}
          </div>
        )}
      </div>
    </button>
  )
}
