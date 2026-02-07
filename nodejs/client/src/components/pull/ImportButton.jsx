export default function ImportButton({ disabled, loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: '0.5rem 1.5rem',
        backgroundColor: disabled || loading ? '#ccc' : '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontWeight: 600
      }}
    >
      {loading ? 'Importing…' : 'Import'}
    </button>
  )
}
