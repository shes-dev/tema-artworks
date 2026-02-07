export default function ObjectIdInput({ objectIdsText, useDemo, onObjectIdsChange, onUseDemoChange }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={useDemo}
          onChange={(e) => onUseDemoChange(e.target.checked)}
        />
        <span style={{ fontWeight: 600 }}>Use demo (10 objects, 2 stable + 8 new)</span>
      </label>
      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Object IDs (comma-separated)</label>
      <textarea
        value={objectIdsText}
        onChange={(e) => onObjectIdsChange(e.target.value)}
        placeholder="e.g. 1234, 5678"
        disabled={useDemo}
        rows={3}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '0.5rem',
          fontFamily: 'inherit',
          boxSizing: 'border-box'
        }}
      />
    </div>
  )
}
