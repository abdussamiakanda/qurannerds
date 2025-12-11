import { useState } from 'react'
import { X } from 'lucide-react'
import './AyahInsertModal.css'

function AyahInsertModal({ isOpen, onClose, onInsert }) {
  const [surah, setSurah] = useState('')
  const [ayah, setAyah] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    // Parse ayah input - can be single number or range like "1-4"
    let startAyah, endAyah
    if (ayah.includes('-')) {
      const parts = ayah.split('-').map(s => s.trim())
      startAyah = parseInt(parts[0])
      endAyah = parseInt(parts[1])
      
      if (isNaN(startAyah) || isNaN(endAyah) || startAyah < 1 || endAyah < 1) {
        setError('Invalid ayah range. Use format like "1-4"')
        return
      }
      
      if (startAyah > endAyah) {
        setError('Start ayah must be less than or equal to end ayah')
        return
      }
    } else {
      startAyah = parseInt(ayah)
      endAyah = parseInt(ayah)
      
      if (isNaN(startAyah) || startAyah < 1) {
        setError('Ayah number must be a positive number')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      // Fetch all ayahs in the range
      const ayahPromises = []
      for (let ayahNum = startAyah; ayahNum <= endAyah; ayahNum++) {
        ayahPromises.push(
          Promise.all([
            fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/ar.asad`).catch(() => null),
            fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/en.asad`).catch(() => null),
            fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/bn.bengali`).catch(() => null)
          ])
        )
      }

      const allResponses = await Promise.all(ayahPromises)

      // Check if any request failed
      if (allResponses.some(res => !res[0] || !res[1] || !res[2])) {
        throw new Error('Failed to connect to API. Please check your internet connection.')
      }

      // Parse all responses
      const allData = await Promise.all(
        allResponses.map(res => 
          Promise.all([
            res[0].json(),
            res[1].json(),
            res[2].json()
          ])
        )
      )

      // Validate all responses
      for (let i = 0; i < allData.length; i++) {
        const [arabicData, englishData, banglaData] = allData[i]
        if (arabicData.code !== 200 || !arabicData.data) {
          throw new Error(`Failed to fetch Arabic text for ayah ${startAyah + i}. Please check the surah and ayah number.`)
        }
        if (englishData.code !== 200 || !englishData.data) {
          throw new Error(`Failed to fetch English translation for ayah ${startAyah + i}. Please check the surah and ayah number.`)
        }
        if (banglaData.code !== 200 || !banglaData.data) {
          throw new Error(`Failed to fetch Bengali translation for ayah ${startAyah + i}. Please check the surah and ayah number.`)
        }
      }

      // Get surah name from first ayah
      const surahName = allData[0][0].data.surah?.englishName || `Surah ${surahNum}`
      
      // Combine all ayahs
      const arabicTexts = allData.map(([arabicData]) => arabicData.data.text || '').join(' ')
      const englishTexts = allData.map(([, englishData]) => englishData.data.text || '').join(' ')
      const banglaTexts = allData.map(([, , banglaData]) => banglaData.data.text || '').join(' ')
      
      // Format reference (e.g., "Al-Baqara 1-4" or "Al-Baqara 1")
      const referenceText = startAyah === endAyah 
        ? `${surahName} ${startAyah}`
        : `${surahName} ${startAyah}-${endAyah}`

      // Format the verse for insertion
      const formattedVerse = `
<div class="quran-verse">
  <div class="verse-header">
    <span class="verse-reference">${referenceText}</span>
  </div>
  <div class="verse-arabic">
    ${arabicTexts}
  </div>
  <div class="verse-translation">
    <p class="verse-english"><strong>English:</strong> ${englishTexts}</p>
    <p class="verse-bangla"><strong>বাংলা:</strong> ${banglaTexts}</p>
  </div>
</div>
`

      onInsert(formattedVerse)
      onClose()
      setSurah('')
      setAyah('')
    } catch (err) {
      console.error('Error fetching verse:', err)
      setError(err.message || 'Failed to fetch verse. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Insert Quranic Verse</h2>
          <button className="modal-close-btn" onClick={onClose}>
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
              onChange={(e) => setSurah(e.target.value)}
              className="ayah-input"
              placeholder="e.g., 1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ayah">Ayah Number (or range like 1-4)</label>
            <input
              id="ayah"
              type="text"
              value={ayah}
              onChange={(e) => setAyah(e.target.value)}
              className="ayah-input"
              placeholder="e.g., 1 or 1-4"
              required
            />
          </div>

          {error && (
            <div className="ayah-error">
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
              disabled={loading}
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

