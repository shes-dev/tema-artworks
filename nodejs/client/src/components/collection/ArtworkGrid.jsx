import ArtworkCard from './ArtworkCard'

export default function ArtworkGrid({ items, onSelectArtwork }) {
  if (!items?.length) {
    return <p className="p-4 text-neutral-600">No artworks.</p>
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6">
      {items.map((item) => (
        <ArtworkCard
          key={`${item.source}-${item.sourceObjectId}`}
          item={item}
          onClick={onSelectArtwork}
        />
      ))}
    </div>
  )
}
