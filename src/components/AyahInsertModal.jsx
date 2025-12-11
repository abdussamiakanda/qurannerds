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
    const ayahNum = parseInt(ayah)

    if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
      setError('Surah number must be between 1 and 114')
      return
    }

    if (isNaN(ayahNum) || ayahNum < 1) {
      setError('Ayah number must be a positive number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fetch from Al-Quran Cloud API
      const [arabicRes, englishRes, banglaRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/ar.asad`).catch(() => null),
        fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/en.asad`).catch(() => null),
        fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/bn.bengali`).catch(() => null)
      ])

      if (!arabicRes || !englishRes || !banglaRes) {
        throw new Error('Failed to connect to API. Please check your internet connection.')
      }

      const [arabicData, englishData, banglaData] = await Promise.all([
        arabicRes.json(),
        englishRes.json(),
        banglaRes.json()
      ])

      if (arabicData.code !== 200 || !arabicData.data) {
        throw new Error('Failed to fetch Arabic text. Please check the surah and ayah number.')
      }

      if (englishData.code !== 200 || !englishData.data) {
        throw new Error('Failed to fetch English translation. Please check the surah and ayah number.')
      }

      if (banglaData.code !== 200 || !banglaData.data) {
        throw new Error('Failed to fetch Bengali translation. Please check the surah and ayah number.')
      }

      const arabicText = arabicData.data.text || ''
      const englishText = englishData.data.text || ''
      const banglaText = banglaData.data.text || ''
      const surahName = arabicData.data.surah?.englishName || `Surah ${surahNum}`
      const ayahNumber = arabicData.data.numberInSurah || ayahNum

      // Format the verse for insertion
      const formattedVerse = `
<div class="quran-verse">
  <div class="verse-header">
    <span class="verse-reference">${surahName} ${ayahNumber}</span>
  </div>
  <div class="verse-arabic">
    ${arabicText}
  </div>
  <div class="verse-translation">
    <p class="verse-english"><strong>English:</strong> ${englishText}</p>
    <p class="verse-bangla"><strong>বাংলা:</strong> ${banglaText}</p>
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
            <label htmlFor="ayah">Ayah Number</label>
            <input
              id="ayah"
              type="number"
              min="1"
              value={ayah}
              onChange={(e) => setAyah(e.target.value)}
              className="ayah-input"
              placeholder="e.g., 1"
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

