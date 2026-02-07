export default function SourceSelector({ value, onChange }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Source</label>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="radio"
            name="source"
            value="met"
            checked={value === 'met'}
            onChange={() => onChange('met')}
          />
          MET Museum (enabled)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', cursor: 'not-allowed' }}>
          <input type="radio" name="source" value="gdrive" disabled />
          Google Drive (coming later)
        </label>
      </div>
    </div>
  )
}
