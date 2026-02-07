import { useState, useMemo, useEffect, useRef } from 'react'
import { importMet, getLatestImportSummary } from '../api/api'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import LinearProgress from '@mui/material/LinearProgress'

const SOURCE_GOOGLE_DEMO = 'google-demo'
const SOURCE_MET = 'met'
const POLL_INTERVAL_MS = 2000
const PROGRESS_RAMP_MS = 3000
const JOB_COMPLETE_SKEW_MS = 5000
const POLL_TIMEOUT_MS = 120000

export default function PullCollectionPage() {
  const [source, setSource] = useState(SOURCE_MET)
  const [objectIdsText, setObjectIdsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [jobComplete, setJobComplete] = useState(false)
  const rampStartRef = useRef(null)
  const pollTimerRef = useRef(null)

  const parsedIds = useMemo(
    () =>
      objectIdsText
        .split(/[\s,]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0),
    [objectIdsText]
  )

  const canImport =
    source === SOURCE_GOOGLE_DEMO ||
    (source === SOURCE_MET && parsedIds.length > 0)

  const handleImport = async () => {
    setError(null)
    setResult(null)
    setJobComplete(false)
    setProgress(0)
    setLoading(true)
    try {
      const payload =
        source === SOURCE_GOOGLE_DEMO ? { demo: true } : { objectIds: parsedIds }
      const data = await importMet(payload)
      setResult(data)
      rampStartRef.current = Date.now()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!result?.jobId) return
    const jobStartTime = parseInt(result.jobId.replace(/^job-/, ''), 10) || 0
    if (!jobStartTime) return

    const rampTo90 = () => {
      const elapsed = Date.now() - (rampStartRef.current ?? 0)
      const p = Math.min(90, (elapsed / PROGRESS_RAMP_MS) * 90)
      setProgress(p)
      if (p < 90) requestAnimationFrame(rampTo90)
    }
    requestAnimationFrame(rampTo90)

    const startTime = Date.now()
    const poll = async () => {
      if (Date.now() - startTime > POLL_TIMEOUT_MS) return
      try {
        const summary = await getLatestImportSummary()
        const importedAt = summary?.importedAt ? new Date(summary.importedAt).getTime() : 0
        if (importedAt >= jobStartTime - JOB_COMPLETE_SKEW_MS) {
          setProgress(100)
          setJobComplete(true)
          return
        }
      } catch {
        // 501 = no previous import; keep polling
      }
      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
    const t = setTimeout(poll, POLL_INTERVAL_MS)
    pollTimerRef.current = t

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [result?.jobId])


  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography
        component="h1"
        className="pull-collection-title"
        sx={{
          fontFamily: 'Caveat, cursive',
          fontSize: '2.25rem',
          fontWeight: 600,
          textAlign: 'center',
          mb: 4,
          color: 'text.primary'
        }}
      >
        Pull Collection
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 4
        }}
      >
        <Card
          variant="outlined"
          onClick={() => setSource(SOURCE_GOOGLE_DEMO)}
          sx={{
            cursor: 'pointer',
            borderWidth: 2,
            borderColor: source === SOURCE_GOOGLE_DEMO ? 'primary.main' : 'grey.300',
            bgcolor: source === SOURCE_GOOGLE_DEMO ? 'action.selected' : 'background.paper',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': {
              borderColor: 'primary.light',
              bgcolor: 'action.hover'
            }
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Google Drive
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Demo (local folder)
            </Typography>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          onClick={() => setSource(SOURCE_MET)}
          sx={{
            cursor: 'pointer',
            borderWidth: 2,
            borderColor: source === SOURCE_MET ? 'primary.main' : 'grey.300',
            bgcolor: source === SOURCE_MET ? 'action.selected' : 'background.paper',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': {
              borderColor: 'primary.light',
              bgcolor: 'action.hover'
            }
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              MET CMS
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Custom object IDs
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="e.g. 1234, 5678"
              label="Object IDs (comma-separated)"
              value={objectIdsText}
              onChange={(e) => setObjectIdsText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onFocus={() => setSource(SOURCE_MET)}
              variant="outlined"
              size="small"
            />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={!canImport || loading}
          onClick={handleImport}
          sx={{ minWidth: 160 }}
        >
          {loading ? 'Importing…' : 'Import'}
        </Button>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        {result && (
          <Box sx={{ width: '100%', maxWidth: 360 }}>
            {progress > 0 && !jobComplete && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, display: 'block' }}>
                  {Math.round(progress)}%
                </Typography>
              </Box>
            )}
            <Typography variant="body2" color="text.primary">
              {jobComplete ? 'Import complete.' : `Import started.${result.jobId ? ` Job ID: ${result.jobId}` : ''}`}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
