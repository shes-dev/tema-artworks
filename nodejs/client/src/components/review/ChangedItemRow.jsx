import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function ChangedItemRow({ item }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const title = item.title ?? `Item ${item.sourceObjectId}`
  const thumbnail = item.thumbnail ?? item.normalized?.images?.primary
  const changeType = item.changeType ?? 'updated'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem',
        borderBottom: '1px solid #eee'
      }}
    >
      {thumbnail ? (
        <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
          {!imageLoaded && (
            <span className="absolute inset-0 flex items-center justify-center text-neutral-400" aria-hidden>
              <Loader2 className="h-6 w-6 animate-spin" />
            </span>
          )}
          <img
            src={thumbnail}
            alt=""
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      ) : null}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500 }}>{title}</span>
        <span style={{ color: '#666', marginLeft: '0.5rem' }}>ID: {item.sourceObjectId}</span>
      </div>
      <span
        style={{
          padding: '0.25rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.85rem',
          backgroundColor: changeType === 'new' ? '#d4edda' : changeType === 'removed' ? '#f8d7da' : '#fff3cd',
          color: '#333'
        }}
      >
        {changeType}
      </span>
    </div>
  )
}
