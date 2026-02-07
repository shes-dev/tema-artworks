import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

/** POST /import/met. payload: { objectIds: number[] } or { demo: true }. Returns { jobId?, status }. */
export const importMet = async (payload) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/import/met`, payload)
        return response.data
    } catch (error) {
        console.error('Error importing MET:', error)
        throw error
    }
}

/** GET /collection. params: { page?, limit?, tags?, query? }. Returns { items, total, page, limit }. */
export const getCollection = async (params = {}) => {
    try {
        const qs = new URLSearchParams()
        if (params.page != null) qs.set('page', String(params.page))
        if (params.limit != null) qs.set('limit', String(params.limit))
        if (params.query) qs.set('query', params.query)
        if (params.tags?.length) params.tags.forEach((t) => qs.append('tags', t))
        const response = await axios.get(`${API_BASE_URL}/collection?${qs.toString()}`)
        return response.data
    } catch (error) {
        console.error('Error fetching collection:', error)
        throw error
    }
}

/** GET /collection/:source/:sourceObjectId. Returns { source, sourceObjectId, normalized }. */
export const getArtwork = async (source, sourceObjectId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/collection/${source}/${sourceObjectId}`)
        return response.data
    } catch (error) {
        console.error('Error fetching artwork:', error)
        throw error
    }
}

/** GET /imports/latest/summary. Returns { importedAt, version, summary: { new, updated, removed }, items }. 501 when no previous snapshot. */
export const getLatestImportSummary = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/imports/latest/summary`)
        return response.data
    } catch (error) {
        console.error('Error fetching import summary:', error)
        throw error
    }
}

/** POST /collection/:source/:sourceObjectId/enrich. options: { apply?: boolean }. Returns { tags, applied? }. */
export const enrichArtwork = async (source, sourceObjectId, options = {}) => {
    try {
        const body = options.apply ? { apply: true } : {}
        const response = await axios.post(
            `${API_BASE_URL}/collection/${source}/${sourceObjectId}/enrich`,
            body
        )
        return response.data
    } catch (error) {
        console.error('Error enriching artwork:', error)
        throw error
    }
}
