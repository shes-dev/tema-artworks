import { useState, useEffect } from 'react'
import PullCollectionPage from './pages/PullCollectionPage'
import ReviewChangesPage from './pages/ReviewChangesPage'
import CollectionPage from './pages/CollectionPage'

function App() {
  const [currentPage, setCurrentPage] = useState('pull')

  const syncPageFromHash = () => {
    const hash = window.location.hash
    if (hash === '#pull') setCurrentPage('pull')
    else if (hash === '#review') setCurrentPage('review')
    else if (hash === '#collection') setCurrentPage('collection')
    else setCurrentPage('pull')
  }

  useEffect(() => {
    syncPageFromHash()
    window.addEventListener('hashchange', syncPageFromHash)
    return () => window.removeEventListener('hashchange', syncPageFromHash)
  }, [])

  const handlePageChange = (page) => {
    setCurrentPage(page)
    const hashMap = {
      pull: '#pull',
      review: '#review',
      collection: '#collection'
    }
    window.location.hash = hashMap[page] ?? ''
  }

  const getButtonStyle = (page) => ({
    marginRight: '10px',
    padding: '5px 15px',
    backgroundColor: currentPage === page ? '#007bff' : '#f0f0f0',
    color: currentPage === page ? 'white' : 'black',
    border: '1px solid #ccc',
    cursor: 'pointer',
    fontSize: '12px'
  })

  const renderPage = () => {
    switch (currentPage) {
      case 'pull':
        return <PullCollectionPage />
      case 'review':
        return <ReviewChangesPage />
      case 'collection':
        return <CollectionPage />
      default:
        return <PullCollectionPage />
    }
  }

  return (
    <div className="App">
      <nav style={{ padding: '10px', borderBottom: '1px solid #ccc', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        <button onClick={() => handlePageChange('pull')} style={getButtonStyle('pull')}>Pull Collection</button>
        <button onClick={() => handlePageChange('review')} style={getButtonStyle('review')}>Review Changes</button>
        <button onClick={() => handlePageChange('collection')} style={getButtonStyle('collection')}>View Collection</button>
      </nav>
      {renderPage()}
    </div>
  )
}

export default App
