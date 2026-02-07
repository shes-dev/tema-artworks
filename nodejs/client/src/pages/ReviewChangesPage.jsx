import { useState } from 'react'
import { getLatestImportSummary } from '../api/api'
import ChangesSummary from '../components/review/ChangesSummary'
import ChangedItemRow from '../components/review/ChangedItemRow'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'

export default function ReviewChangesPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleCheck() {
    setError(null)
    setData(null)
    setLoading(true)
    getLatestImportSummary()
      .then((res) => {
        setData(res)
      })
      .catch((err) => {
        setError(err.response?.status ?? 'network')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const noPreviousImport = error === 501 || error === 404
  const genericError = error && !noPreviousImport

  const pageContent = (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCheck}
          disabled={loading}
          sx={{ minWidth: 160 }}
        >
          {loading ? 'Checking…' : 'Check'}
        </Button>
      </Box>
      {noPreviousImport && (
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          No previous import to compare. Pull a collection first.
        </Typography>
      )}
      {genericError && (
        <Typography color="error" sx={{ textAlign: 'center' }}>
          Failed to load summary.
        </Typography>
      )}
      {!noPreviousImport && !genericError && !data && !loading && (
        <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center' }}>
          Click Check to compare the latest import with the previous one.
        </Typography>
      )}
      {data && (() => {
        const summary = data.summary ?? {}
        const items = data.items ?? []
        const hasNoChanges =
          (summary.new ?? 0) === 0 && (summary.updated ?? 0) === 0 && (summary.removed ?? 0) === 0
        return hasNoChanges ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            No changes from this import compared to the last.
          </Typography>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <ChangesSummary summary={summary} />
            </Box>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              {items.length === 0 ? (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary">No items.</Typography>
                </Box>
              ) : (
                items.map((item, i) => (
                  <ChangedItemRow
                    key={`${item.source}-${item.sourceObjectId}-${i}`}
                    item={{
                      ...item,
                      thumbnail: item.thumbnail ?? item.normalized?.images?.primary
                    }}
                  />
                ))
              )}
            </Paper>
          </>
        )
      })()}
    </>
  )

  return (
    <Box sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
      <Typography
        component="h1"
        className="review-changes-title"
        sx={{
          fontFamily: 'Caveat, cursive',
          fontSize: '2.25rem',
          fontWeight: 600,
          textAlign: 'center',
          mb: 4,
          color: 'text.primary'
        }}
      >
        Review Changes
      </Typography>
      {loading ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
          Loading…
        </Typography>
      ) : (
        pageContent
      )}
    </Box>
  )
}
