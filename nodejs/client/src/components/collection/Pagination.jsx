export default function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="flex items-center gap-2 mt-4 flex-wrap">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrev}
        className="px-3 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-700 font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        Previous
      </button>
      <span className="text-sm text-neutral-600">
        Page {page} of {totalPages} ({total} total)
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
        className="px-3 py-1.5 border border-neutral-300 rounded-md bg-white text-neutral-700 font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        Next
      </button>
    </div>
  )
}
