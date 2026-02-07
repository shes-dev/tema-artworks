import { formatTagForDisplay } from '../../utils/tags'

export default function TagFilter({ options, selectedTags, onChange }) {
  const hasOptions = options && options.length > 0
  const sortedOptions = hasOptions
    ? [...options].sort((a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' }))
    : []

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag))
    } else {
      onChange([...selectedTags, tag])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-neutral-700">Metadata filtering</span>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={selectedTags.length === 0}
          className="text-xs px-2 py-1 border border-neutral-300 rounded-md bg-white text-neutral-600 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          Reset
        </button>
      </div>
      {hasOptions ? (
        <div className="flex flex-wrap gap-2">
          {sortedOptions.map((tag) => {
            const selected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center px-2 py-1.5 rounded-md text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 ${
                  selected
                    ? 'bg-neutral-800 text-white border-neutral-800'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                {formatTagForDisplay(tag)}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No tags available</p>
      )}
    </div>
  )
}
