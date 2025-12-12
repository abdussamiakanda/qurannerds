import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import './AyahInsertModal.css'

// HTML sanitization helper to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function AyahInsertModal({ onClose, onInsert }) {
  const [surah, setSurah] = useState('')
  const [ayah, setAyah] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, loading])

  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      setError('')
    }
  }, [surah, ayah])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!surah || !ayah) {
      setError('Please enter both surah and ayah number')
      return
    }

    const surahNum = parseInt(surah)

    if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
      setError('Surah number must be between 1 and 114')
      return
    }

    // Parse ayah input - can be single number or range like "1-4" or "1 - 4"
    let startAyah, endAyah
    const ayahTrimmed = ayah.trim()
    
    if (ayahTrimmed.includes('-')) {
      const parts = ayahTrimmed.split(/[-\u2013\u2014]/).map(s => s.trim()).filter(s => s)
      if (parts.length !== 2) {
        setError('Invalid ayah range format. Use format like "1-4" or "1 - 4"')
        return
      }
      
      startAyah = parseInt(parts[0])
      endAyah = parseInt(parts[1])
      
      if (isNaN(startAyah) || isNaN(endAyah) || startAyah < 1 || endAyah < 1) {
        setError('Ayah numbers must be positive integers')
        return
      }
      
      if (startAyah > endAyah) {
        setError('Start ayah must be less than or equal to end ayah')
        return
      }
      
      // Limit range to 10 ayahs
      if (endAyah - startAyah + 1 > 10) {
        setError('Maximum 10 ayahs can be fetched at once. Please use a smaller range.')
        return
      }
    } else {
      startAyah = parseInt(ayahTrimmed)
      endAyah = parseInt(ayahTrimmed)
      
      if (isNaN(startAyah) || startAyah < 1) {
        setError('Ayah number must be a positive integer')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      // Fetch all ayahs in the range using Promise.allSettled for better error handling
      const ayahPromises = []
      for (let ayahNum = startAyah; ayahNum <= endAyah; ayahNum++) {
        ayahPromises.push(
          Promise.allSettled([
            fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/ar.asad`),
            fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/en.asad`),
            fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/bn.bengali`)
          ])
        )
      }

      const allResults = await Promise.all(ayahPromises)

      // Check for network errors and validate responses
      // allResults is an array where each element is the result of Promise.allSettled
      // which is an array of 3 objects: [{status, value, reason}, ...]
      const validatedResponses = []
      for (let i = 0; i < allResults.length; i++) {
        const results = allResults[i]
        
        // results should be an array of 3 Promise.allSettled results
        if (!Array.isArray(results) || results.length !== 3) {
          throw new Error(`Unexpected response format for ayah ${startAyah + i}. Please try again.`)
        }
        
        const [arabicResult, englishResult, banglaResult] = results
        
        // Check if any fetch failed
        if (arabicResult.status === 'rejected' || !arabicResult.value || !arabicResult.value.ok) {
          const reason = arabicResult.reason?.message || arabicResult.reason || 'Network error'
          throw new Error(`Failed to fetch Arabic text for ayah ${startAyah + i}: ${reason}`)
        }
        if (englishResult.status === 'rejected' || !englishResult.value || !englishResult.value.ok) {
          const reason = englishResult.reason?.message || englishResult.reason || 'Network error'
          throw new Error(`Failed to fetch English translation for ayah ${startAyah + i}: ${reason}`)
        }
        if (banglaResult.status === 'rejected' || !banglaResult.value || !banglaResult.value.ok) {
          const reason = banglaResult.reason?.message || banglaResult.reason || 'Network error'
          throw new Error(`Failed to fetch Bengali translation for ayah ${startAyah + i}: ${reason}`)
        }
        
        validatedResponses.push({
          arabic: arabicResult.value,
          english: englishResult.value,
          bangla: banglaResult.value
        })
      }

      // Parse all responses
      const allData = await Promise.all(
        validatedResponses.map(({ arabic, english, bangla }) => 
          Promise.all([
            arabic.json(),
            english.json(),
            bangla.json()
          ])
        )
      )

      // Validate all responses
      for (let i = 0; i < allData.length; i++) {
        const [arabicData, englishData, banglaData] = allData[i]
        
        if (!arabicData || arabicData.code !== 200 || !arabicData.data || !arabicData.data.text) {
          throw new Error(`Invalid response for Arabic text of ayah ${startAyah + i}. Please try again.`)
        }
        if (!englishData || englishData.code !== 200 || !englishData.data || !englishData.data.text) {
          throw new Error(`Invalid response for English translation of ayah ${startAyah + i}. Please try again.`)
        }
        if (!banglaData || banglaData.code !== 200 || !banglaData.data || !banglaData.data.text) {
          throw new Error(`Invalid response for Bengali translation of ayah ${startAyah + i}. Please try again.`)
        }
      }

      // Get surah name from first ayah
      const surahName = allData[0][0].data.surah?.englishName || `Surah ${surahNum}`
      
      // Combine all ayahs (sanitize to prevent XSS)
      const arabicTexts = allData.map(([arabicData]) => arabicData.data.text || '').join(' ')
      const englishTexts = allData.map(([, englishData]) => englishData.data.text || '').join(' ')
      const banglaTexts = allData.map(([, , banglaData]) => banglaData.data.text || '').join(' ')
      
      // Format reference (e.g., "Al-Baqara 1-4" or "Al-Baqara 1")
      const referenceText = startAyah === endAyah 
        ? `${surahName} ${startAyah}`
        : `${surahName} ${startAyah}-${endAyah}`

      // Escape reference for HTML attribute (escape quotes and special chars)
      const escapedReference = referenceText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')

      // Format the verse for insertion with proper HTML sanitization
      // Note: Arabic text is trusted from API, but we escape English/Bangla for safety
      // Remove any leading/trailing whitespace and newlines to prevent empty divs
      // Include data-verse-reference attribute for audio button functionality
      const formattedVerse = `<div class="quran-verse">
  <div class="verse-header" data-verse-reference="${escapedReference}">
    <span class="verse-reference">${escapeHtml(referenceText)}</span>
  </div>
  <div class="verse-arabic">
    ${arabicTexts}
  </div>
  <div class="verse-translation">
    <div class="verse-english"><strong>English:</strong> ${escapeHtml(englishTexts)}</div>
    <div class="verse-bangla"><strong>বাংলা:</strong> ${escapeHtml(banglaTexts)}</div>
  </div>
</div>`.trim()

      onInsert(formattedVerse)
      onClose()
      setSurah('')
      setAyah('')
      setError('')
    } catch (err) {
      console.error('Error fetching verse:', err)
      setError(err.message || 'Failed to fetch verse. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    if (field === 'surah') {
      setSurah(value)
    } else if (field === 'ayah') {
      setAyah(value)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && surah && ayah) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Insert Quranic Verse</h2>
          <button 
            className="modal-close-btn" 
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="ayah-form">
          <div className="form-group">
            <label htmlFor="surah">Surah Number (1-114)</label>
            <input
              id="surah"
              type="number"
              min="1"
              max="114"
              value={surah}
              onChange={(e) => handleInputChange('surah', e.target.value)}
              onKeyDown={handleKeyDown}
              className="ayah-input"
              placeholder="e.g., 1"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="ayah">Ayah Number (or range like 1-4)</label>
            <input
              id="ayah"
              type="text"
              value={ayah}
              onChange={(e) => handleInputChange('ayah', e.target.value)}
              onKeyDown={handleKeyDown}
              className="ayah-input"
              placeholder="e.g., 1 or 1-4"
              disabled={loading}
            />
            <small style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '4px' }}>
              Maximum 10 ayahs can be fetched at once
            </small>
          </div>

          {error && (
            <div className="ayah-error" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="insert-btn"
              disabled={loading || !surah || !ayah}
            >
              {loading ? 'Fetching...' : 'Insert Verse'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AyahInsertModal

