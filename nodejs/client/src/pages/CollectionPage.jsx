import { useState, useEffect, useMemo } from 'react'
import { getCollection, getArtwork, enrichArtwork } from '../api/api'
import TagFilter from '../components/collection/TagFilter'
import ArtworkGrid from '../components/collection/ArtworkGrid'
import Pagination from '../components/collection/Pagination'
import ArtworkModal from '../components/collection/ArtworkModal'
import ArtworkDetails from '../components/collection/ArtworkDetails'
import EnrichButton from '../components/collection/EnrichButton'
import EnrichResultModal from '../components/collection/EnrichResultModal'

const DEFAULT_LIMIT = 100

export default function CollectionPage() {
  const [page, setPage] = useState(1)
  const [limit] = useState(DEFAULT_LIMIT)
  const [tags, setTags] = useState([])
  const [allTagsSeen, setAllTagsSeen] = useState(() => new Set())
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [artworkDetail, setArtworkDetail] = useState(null)
  const [artworkLoading, setArtworkLoading] = useState(false)
  const [enrichResultTags, setEnrichResultTags] = useState(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)

  const tagOptions = useMemo(
    () => Array.from(allTagsSeen).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [allTagsSeen]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCollection({ page, limit, tags: tags.length ? tags : undefined })
      .then((data) => {
        if (!cancelled) {
          const list = data.items ?? []
          setItems(list)
          setTotal(data.total ?? 0)
          setAllTagsSeen((prev) => {
            const next = new Set(prev)
            list.forEach((item) => {
              const t = item.normalized?.tags
              if (Array.isArray(t)) t.forEach((tag) => next.add(tag))
            })
            return next
          })
        }
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, limit, tags])

  useEffect(() => {
    setPage(1)
  }, [tags])

  useEffect(() => {
    if (!selectedArtwork) {
      setArtworkDetail(null)
      return
    }
    let cancelled = false
    setArtworkLoading(true)
    getArtwork(selectedArtwork.source, selectedArtwork.sourceObjectId)
      .then((data) => {
        if (!cancelled) setArtworkDetail(data)
      })
      .catch(() => {
        if (!cancelled) setArtworkDetail(null)
      })
      .finally(() => {
        if (!cancelled) setArtworkLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedArtwork?.source, selectedArtwork?.sourceObjectId])

  const handleEnrich = async () => {
    if (!selectedArtwork) return
    setEnrichLoading(true)
    setEnrichResultTags(null)
    try {
      const data = await enrichArtwork(selectedArtwork.source, selectedArtwork.sourceObjectId)
      setEnrichResultTags(data.tags ?? [])
    } catch {
      setEnrichResultTags([])
    } finally {
      setEnrichLoading(false)
    }
  }

  const handleApplyTags = async (source, sourceObjectId) => {
    setApplyLoading(true)
    try {
      await enrichArtwork(source, sourceObjectId, { apply: true })
      setEnrichResultTags(null)
      setSelectedArtwork(null)
      setArtworkDetail(null)
      const data = await getCollection({ page, limit, tags: tags.length ? tags : undefined })
      const list = data.items ?? []
      setItems(list)
      setTotal(data.total ?? 0)
      setAllTagsSeen((prev) => {
        const next = new Set(prev)
        list.forEach((item) => {
          const t = item.normalized?.tags
          if (Array.isArray(t)) t.forEach((tag) => next.add(tag))
        })
        return next
      })
    } finally {
      setApplyLoading(false)
    }
  }

  const closeModals = () => {
    setEnrichResultTags(null)
    setSelectedArtwork(null)
  }

  return (
    <div className="p-4">
      <h1 className="view-collection-title text-4xl font-semibold mb-4 text-neutral-900 text-center">
        View Collection
      </h1>
      <div className="flex flex-wrap gap-4 mb-8 items-start">
        <TagFilter options={tagOptions} selectedTags={tags} onChange={setTags} />
      </div>
      {loading ? (
        <p className="text-neutral-600">Loading…</p>
      ) : (
        <>
          <ArtworkGrid items={items} onSelectArtwork={setSelectedArtwork} />
          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}

      <ArtworkModal selectedArtwork={selectedArtwork} onClose={closeModals}>
        {artworkLoading ? (
          <p className="text-neutral-600">Loading…</p>
        ) : (
          <ArtworkDetails artwork={artworkDetail}>
            <button
              type="button"
              onClick={closeModals}
              className="px-4 py-2 border border-neutral-300 rounded-md bg-white text-neutral-700 font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              Close
            </button>
            <EnrichButton onClick={handleEnrich} loading={enrichLoading} />
          </ArtworkDetails>
        )}
      </ArtworkModal>

      <EnrichResultModal
        tags={enrichResultTags}
        onClose={() => setEnrichResultTags(null)}
        onApply={handleApplyTags}
        applyLoading={applyLoading}
        source={selectedArtwork?.source}
        sourceObjectId={selectedArtwork?.sourceObjectId}
      />
    </div>
  )
}
