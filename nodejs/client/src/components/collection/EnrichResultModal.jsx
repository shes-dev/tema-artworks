import { X } from 'lucide-react'
import { sortAndFormatTags } from '../../utils/tags'

export default function EnrichResultModal({ tags, onClose, onApply, applyLoading, source, sourceObjectId }) {
  if (tags == null) return null
  const hasApply = typeof onApply === 'function' && source && sourceObjectId != null
  const displayTags = Array.isArray(tags) && tags.length > 0 ? sortAndFormatTags(tags) : []

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001]"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-[400px] w-[90%] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0 text-xl font-semibold flex-1">AI Enrichment Result</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4">
          {displayTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="m-0 text-neutral-500">No tags suggested.</p>
          )}
        </div>
        <div className="flex gap-2 justify-end flex-wrap">
          {hasApply && (
            <button
              type="button"
              onClick={() => onApply(source, sourceObjectId)}
              disabled={applyLoading}
              className="px-4 py-2 bg-green-600 text-white border-0 rounded-md cursor-pointer hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {applyLoading ? 'Applying…' : 'Apply tags'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 rounded-md bg-white text-neutral-700 font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
