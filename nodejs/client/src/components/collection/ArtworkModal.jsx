import { X } from 'lucide-react'

export default function ArtworkModal({ selectedArtwork, onClose, children }) {
  if (!selectedArtwork) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] overflow-y-auto py-8"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-[90%] max-w-[900px] max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center shrink-0 p-6 border-b border-neutral-100">
          <h2 className="m-0 text-xl font-semibold flex-1 text-center text-neutral-900">More Info</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
