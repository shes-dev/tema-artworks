import Typography from '@mui/material/Typography'

export default function ChangesSummary({ summary }) {
  if (!summary) return null
  const { new: newCount = 0, updated = 0, removed = 0 } = summary
  const parts = []
  if (newCount) parts.push(`${newCount} new`)
  if (updated) parts.push(`${updated} updated`)
  if (removed) parts.push(`${removed} removed`)
  if (parts.length === 0) return <Typography>No changes.</Typography>
  return (
    <Typography sx={{ mb: 2, fontWeight: 600 }}>
      {parts.join(' • ')}
    </Typography>
  )
}
