export default function EnrichButton({ onClick, loading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 bg-neutral-800 text-white font-semibold rounded-md border-0 cursor-pointer hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-neutral-800"
    >
      {loading ? 'Loading…' : 'AI Enrichment'}
    </button>
  )
}
