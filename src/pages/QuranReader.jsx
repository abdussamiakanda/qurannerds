import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import { Play, Pause, Volume2, VolumeX, BookOpen, Book, CheckCircle, Menu, X } from 'lucide-react'
import { getAudioUrl } from '../utils/textUtils'
import './QuranReader.css'

function QuranReader({ user }) {
  const [surahs, setSurahs] = useState([])
  const [selectedSurah, setSelectedSurah] = useState(null)
  const [ayahs, setAyahs] = useState([])
  const [loading, setLoading] = useState(true)
  const [audioLoading, setAudioLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAyah, setCurrentAyah] = useState(null)
  const [progress, setProgress] = useState({})
  const [audioUrl, setAudioUrl] = useState('')
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [activeTab, setActiveTab] = useState('quran') // 'quran' or 'hadith'
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [translations, setTranslations] = useState({}) // { verse_id: { en: '', bn: '' } }
  const [showTranslation, setShowTranslation] = useState(true)
  const [translationLang, setTranslationLang] = useState('en') // 'en' or 'bn'
  const [autoplay, setAutoplay] = useState(false)
  
  // Hadith state
  const [hadithCollections, setHadithCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [hadiths, setHadiths] = useState([])
  const [hadithLoading, setHadithLoading] = useState(false)
  
  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const audioRef = useRef(null)
  const progressIntervalRef = useRef(null)

  const getSurahNumber = (surah) => {
    if (!surah) return null
    // Quran.com API uses 'id' for chapter_number, ensure it's a number
    const num = surah.id || surah.chapter_number || surah.number
    return num ? Number(num) : null
  }

  useEffect(() => {
    if (activeTab === 'quran') {
      if (surahs.length === 0) {
        fetchSurahs()
      }
      if (user) {
        fetchProgress()
      }
    } else if (activeTab === 'hadith') {
      if (hadithCollections.length === 0) {
        fetchHadithCollections()
      }
      if (user) {
        fetchHadithProgress()
      }
    }
  }, [user, activeTab])

  useEffect(() => {
    if (activeTab === 'quran' && selectedSurah) {
      const surahNum = getSurahNumber(selectedSurah)
      fetchAyahs(surahNum)
    } else if (activeTab === 'hadith' && selectedCollection) {
      fetchHadiths(selectedCollection.id)
    }
  }, [selectedSurah, selectedCollection, activeTab])

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const fetchSurahs = async () => {
    try {
      // Using Quran.com API for surah list
      const response = await fetch('https://api.quran.com/api/v4/chapters?language=en')
      const data = await response.json()
      setSurahs(data.chapters || [])
    } catch (error) {
      console.error('Error fetching surahs:', error)
      // Fallback: create basic surah list
      const fallbackSurahs = Array.from({ length: 114 }, (_, i) => ({
        id: i + 1,
        chapter_number: i + 1,
        name_simple: `Surah ${i + 1}`,
        name_arabic: '',
        verses_count: 0
      }))
      setSurahs(fallbackSurahs)
    } finally {
      setLoading(false)
    }
  }

  const fetchAyahs = async (surahNumber) => {
    try {
      setLoading(true)
      
      // Use Al-Quran Cloud API to fetch entire surah at once (more efficient)
      // This endpoint returns all ayahs of a surah in a single request
      const [arabicResponse, englishResponse, banglaResponse] = await Promise.allSettled([
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.asad`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/en.asad`),
        fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/bn.bengali`)
      ])
      
      // Parse responses
      let arabicData = null
      let englishData = null
      let banglaData = null
      
      if (arabicResponse.status === 'fulfilled' && arabicResponse.value.ok) {
        arabicData = await arabicResponse.value.json()
      }
      
      if (englishResponse.status === 'fulfilled' && englishResponse.value.ok) {
        englishData = await englishResponse.value.json()
      }
      
      if (banglaResponse.status === 'fulfilled' && banglaResponse.value.ok) {
        banglaData = await banglaResponse.value.json()
      }
      
      // Validate Arabic data (required)
      if (!arabicData || arabicData.code !== 200 || !arabicData.data || !arabicData.data.ayahs) {
        throw new Error('Failed to fetch surah data')
      }
      
      const ayahsList = []
      const translationsMap = {}
      const arabicAyahs = arabicData.data.ayahs || []
      const englishAyahs = englishData?.data?.ayahs || []
      const banglaAyahs = banglaData?.data?.ayahs || []
      
      // Process all ayahs
      arabicAyahs.forEach((ayah, index) => {
        const ayahNum = ayah.numberInSurah || (index + 1)
        
        // Get Arabic text
        if (ayah.text) {
          ayahsList.push({
            id: `${surahNumber}_${ayahNum}`,
            verse_number: ayahNum,
            chapter_number: surahNumber,
            text_uthmani: ayah.text,
            text: ayah.text
          })
          
          // Get translations
          const englishAyah = englishAyahs.find(a => (a.numberInSurah || a.number) === ayahNum)
          const banglaAyah = banglaAyahs.find(a => (a.numberInSurah || a.number) === ayahNum)
          
          const enText = englishAyah?.text || ''
          const bnText = banglaAyah?.text || ''
          
          translationsMap[`${surahNumber}_${ayahNum}`] = {
            en: enText || 'Translation not available',
            bn: bnText || enText || 'অনুবাদ পাওয়া যায়নি'
          }
        }
      })
      
      setAyahs(ayahsList)
      setTranslations(translationsMap)
    } catch (error) {
      console.error('Error fetching ayahs:', error)
      setAyahs([])
      setTranslations({})
    } finally {
      setLoading(false)
    }
  }

  const fetchProgress = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', 'quran')

      if (error) throw error

      const progressMap = {}
      data?.forEach(item => {
        const key = `${item.surah_number}_${item.ayah_number || 'all'}`
        progressMap[key] = item
      })
      setProgress(progressMap)
    } catch (error) {
      console.error('Error fetching progress:', error)
    }
  }

  const fetchHadithCollections = async () => {
    try {
      setLoading(true)
      // Using Hadith API by Fawaz Ahmed (free, no API key needed)
      // Available collections: bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah
      const collections = [
        { id: 'bukhari', name: 'Sahih Bukhari', nameArabic: 'صحيح البخاري', total: 7563 },
        { id: 'muslim', name: 'Sahih Muslim', nameArabic: 'صحيح مسلم', total: 7563 },
        { id: 'abudawud', name: 'Sunan Abu Dawud', nameArabic: 'سنن أبي داود', total: 5274 },
        { id: 'tirmidhi', name: 'Jami\' at-Tirmidhi', nameArabic: 'جامع الترمذي', total: 3956 },
        { id: 'nasai', name: 'Sunan an-Nasa\'i', nameArabic: 'سنن النسائي', total: 5761 },
        { id: 'ibnmajah', name: 'Sunan Ibn Majah', nameArabic: 'سنن ابن ماجه', total: 4341 }
      ]
      setHadithCollections(collections)
    } catch (error) {
      console.error('Error fetching hadith collections:', error)
      setHadithCollections([])
    } finally {
      setLoading(false)
    }
  }

  const fetchHadiths = async (collectionId, page = 1) => {
    try {
      setHadithLoading(true)
      setLoading(true)
      const hadithsList = []
      const translationsMap = {}
      
      // Map collection IDs to hadithapi.com book slugs
      const bookSlugMap = {
        'bukhari': 'sahih-bukhari',
        'muslim': 'sahih-muslim',
        'abudawud': 'abu-dawood',
        'tirmidhi': 'al-tirmidhi',
        'nasai': 'sunan-nasai',
        'ibnmajah': 'ibn-e-majah'
      }
      
      const bookSlug = bookSlugMap[collectionId] || collectionId
      
      // Using hadithapi.com API
      // Note: You need to register at https://hadithapi.com to get an API key
      // Try multiple possible key names and strip quotes if present
      const rawKey = import.meta.env.VITE_HADITH_API_KEY || 
                     import.meta.env.HADITH_API_KEY || 
                     ''
      // Strip quotes if they were included in the .env value
      const API_KEY = typeof rawKey === 'string' ? rawKey.replace(/^['"]|['"]$/g, '').trim() : ''
      
      // Debug: Check if API key is loaded
      const allHadithKeys = Object.keys(import.meta.env).filter(k => k.includes('HADITH') || k.includes('hadith'))
      const allEnvKeys = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
      
      // Check what the actual key name is
      const hadithKeyDetails = allHadithKeys.map(key => ({
        keyName: key,
        value: import.meta.env[key] ? import.meta.env[key].substring(0, 20) + '...' : 'undefined',
        length: import.meta.env[key] ? import.meta.env[key].length : 0
      }))
      
      // Try to get the key from whatever name it actually has
      const actualKey = allHadithKeys.length > 0 ? import.meta.env[allHadithKeys[0]] : ''
      const directKey = import.meta.env.VITE_HADITH_API_KEY || ''
      
      // Debug: Check raw values
      console.log('Raw environment check:', {
        'import.meta.env.VITE_HADITH_API_KEY': typeof import.meta.env.VITE_HADITH_API_KEY,
        'directKey type': typeof directKey,
        'directKey length': directKey.length,
        'directKey value (first 30)': directKey ? directKey.substring(0, 30) : 'empty',
        'actualKey type': typeof actualKey,
        'actualKey length': actualKey.length,
        'actualKey value (first 30)': actualKey ? actualKey.substring(0, 30) : 'empty'
      })
      
      const finalAPI_KEY = API_KEY || actualKey || directKey || ''
      
      console.log('API Key check:', {
        exists: !!API_KEY,
        length: API_KEY.length,
        firstChars: API_KEY ? API_KEY.substring(0, 15) + '...' : 'empty',
        allHadithKeys: allHadithKeys,
        hadithKeyDetails: hadithKeyDetails,
        actualKeyFound: actualKey ? actualKey.substring(0, 20) + '...' : 'none',
        actualKeyLength: actualKey ? actualKey.length : 0,
        directKeyLength: directKey ? directKey.length : 0,
        finalAPI_KEY: finalAPI_KEY ? finalAPI_KEY.substring(0, 20) + '...' : 'none',
        finalAPI_KEYLength: finalAPI_KEY ? finalAPI_KEY.length : 0
      })
      
      // Log the full key name that was found
      if (allHadithKeys.length > 0) {
        const rawValue = import.meta.env[allHadithKeys[0]]
        console.log('Found Hadith key with name:', allHadithKeys[0])
        console.log('Raw value type:', typeof rawValue)
        console.log('Raw value length:', rawValue ? rawValue.length : 0)
        console.log('Raw value (first 40 chars):', rawValue ? rawValue.substring(0, 40) : 'empty')
      }
      
      // Only try hadithapi.com if we have an API key
      if (finalAPI_KEY && finalAPI_KEY.length > 20) {
        try {
          // Fetch hadiths from hadithapi.com
          // API endpoint: https://hadithapi.com/api/hadiths/?apiKey={API_KEY}&book={bookSlug}&paginate=50
          const response = await fetch(`https://hadithapi.com/api/hadiths/?apiKey=${finalAPI_KEY}&book=${bookSlug}&paginate=50`)
          
          if (response.ok) {
            const data = await response.json()
            console.log('HadithAPI.com response:', data)
            
            // Parse the response structure - check various possible formats
            let hadithsArray = []
            
            if (data && data.hadiths && Array.isArray(data.hadiths)) {
              hadithsArray = data.hadiths
            } else if (data && Array.isArray(data)) {
              hadithsArray = data
            } else if (data && data.data && Array.isArray(data.data)) {
              hadithsArray = data.data
            } else if (data && data.data && data.data.hadiths && Array.isArray(data.data.hadiths)) {
              hadithsArray = data.data.hadiths
            }
            
            hadithsArray.forEach((hadith) => {
              if (hadith) {
                // Handle different property names from the API
                const hadithNum = hadith.hadithNumber || hadith.number || hadith.id
                const arabicText = hadith.hadithArabic || hadith.arabic || hadith.hadithArabicText || ''
                const englishText = hadith.hadithEnglish || hadith.english || hadith.hadithEnglishText || ''
                const bookName = hadith.bookName || hadith.book || ''
                
                if (hadithNum && (englishText || arabicText)) {
                  const hadithId = `${collectionId}_${hadithNum}`
                  
                  hadithsList.push({
                    id: hadithId,
                    number: hadithNum,
                    collection: collectionId,
                    arabic: arabicText,
                    english: englishText,
                    book: bookName,
                    hadithInBook: hadithNum
                  })
                  
                  translationsMap[hadithId] = {
                    en: englishText || 'Translation not available',
                    bn: englishText || 'অনুবাদ পাওয়া যায়নি'
                  }
                }
              }
            })
            
            console.log('Fetched hadiths from hadithapi.com:', hadithsList.length)
          } else if (response.status === 401 || response.status === 403) {
            console.warn('Hadith API authentication failed. Falling back to alternative API.')
          } else {
            console.warn('Hadith API error:', response.status, response.statusText, '- Falling back to alternative API.')
          }
        } catch (apiError) {
          // CORS or network error - fallback to alternative API
          console.warn('Error fetching from hadithapi.com (CORS/network issue). Using fallback API:', apiError.message)
        }
      } else {
        console.log('No Hadith API key found. Using fallback API.')
      }
      
      // Fallback to old API if hadithapi.com fails
      if (hadithsList.length === 0) {
        console.log('Falling back to alternative API...')
        try {
          const [engResponse1, engResponse2, araResponse] = await Promise.allSettled([
            fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-nustaliq-${collectionId}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${collectionId}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${collectionId}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
          ])
        
          let engData = null
          let araData = null
          
          // Prefer eng-nustaliq (English) over eng (which might be Indonesian)
          if (engResponse1.status === 'fulfilled' && engResponse1.value) {
            engData = engResponse1.value
          } else if (engResponse2.status === 'fulfilled' && engResponse2.value) {
            // Check if it's actually English (not Indonesian)
            const sampleText = engResponse2.value?.hadiths?.[0]?.text || engResponse2.value?.hadith?.[0]?.text || ''
            // Indonesian typically contains words like "Telah", "dia", "bersabda"
            // English typically contains words like "Narrated", "said", "Allah's Messenger"
            if (sampleText.includes('Narrated') || sampleText.includes('said') || sampleText.includes("Allah's Messenger") || !sampleText.includes('Telah')) {
              engData = engResponse2.value
            }
          }
          if (araResponse.status === 'fulfilled' && araResponse.value) {
            araData = araResponse.value
          }
          
          // Process full collection if available
          // Check for hadiths (plural) first - this is the actual structure from the API
          if (engData && engData.hadiths && Array.isArray(engData.hadiths)) {
            engData.hadiths.slice(0, 50).forEach((hadith, idx) => {
              const hadithNum = hadith.hadithNumber || (idx + 1)
              const arabicHadith = araData && araData.hadiths && Array.isArray(araData.hadiths) && araData.hadiths[idx] ? araData.hadiths[idx] : null
              
              hadithsList.push({
                id: `${collectionId}_${hadithNum}`,
                number: hadithNum,
                collection: collectionId,
                arabic: arabicHadith?.text || '',
                english: hadith.text || '',
                book: hadith.reference?.book || '',
                hadithInBook: hadith.reference?.hadith || hadithNum
              })
              
              translationsMap[`${collectionId}_${hadithNum}`] = {
                en: hadith.text || 'Translation not available',
                bn: hadith.text || 'অনুবাদ পাওয়া যায়নি'
              }
            })
            console.log('Fetched full collection (fallback):', hadithsList.length, 'hadiths')
          } else if (engData && engData.hadith && Array.isArray(engData.hadith)) {
            // Fallback to singular hadith
            engData.hadith.slice(0, 50).forEach((hadith, idx) => {
              const hadithNum = hadith.hadithNumber || (idx + 1)
              const arabicHadith = araData && araData.hadith && Array.isArray(araData.hadith) && araData.hadith[idx] ? araData.hadith[idx] : null
              
              hadithsList.push({
                id: `${collectionId}_${hadithNum}`,
                number: hadithNum,
                collection: collectionId,
                arabic: arabicHadith?.text || '',
                english: hadith.text || '',
                book: hadith.reference?.book || '',
                hadithInBook: hadith.reference?.hadith || hadithNum
              })
              
              translationsMap[`${collectionId}_${hadithNum}`] = {
                en: hadith.text || 'Translation not available',
                bn: hadith.text || 'অনুবাদ পাওয়া যায়নি'
              }
            })
            console.log('Fetched full collection (fallback, singular):', hadithsList.length, 'hadiths')
          }
        } catch (fullCollectionError) {
          console.log('Fallback API also failed:', fullCollectionError)
        }
      }
      
      // Strategy 2: If full collection didn't work, fetch individual hadiths
      if (hadithsList.length === 0) {
        // Fetch first 20 hadiths in smaller batches to avoid rate limiting
        const batchSize = 5
        const totalToFetch = 20
        
        for (let batchStart = 1; batchStart <= totalToFetch; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, totalToFetch)
        const fetchPromises = []
        
        for (let i = batchStart; i <= batchEnd; i++) {
          fetchPromises.push(
            Promise.allSettled([
              // Try eng-nustaliq first (proper English), then eng (might be Indonesian)
              fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-nustaliq-${collectionId}/${i}.json`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
                .then(data => {
                  if (data) return data
                  // Fallback to eng- but verify it's English
                  return fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${collectionId}/${i}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
                    .then(engData => {
                      if (engData) {
                        // Check if it's actually English
                        const sampleText = engData?.hadith?.[0]?.text || engData?.text || ''
                        if (sampleText.includes('Telah') || sampleText.includes('dia') || sampleText.includes('bersabda')) {
                          // This is Indonesian, return null to try alternative API
                          return null
                        }
                      }
                      return engData
                    })
                }),
              // Arabic format
              fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${collectionId}/${i}.json`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => 
                  // Fallback: Try raw GitHub format
                  fetch(`https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-${collectionId}/${i}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
                )
            ])
          )
        }
        
        const batchResults = await Promise.all(fetchPromises)
        
        // Add small delay between batches to avoid rate limiting
        if (batchStart + batchSize <= totalToFetch) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        batchResults.forEach((results, batchIndex) => {
          const hadithNum = batchStart + batchIndex
          if (!Array.isArray(results) || results.length !== 2) return
          
          const [englishResult, arabicResult] = results
          
          let arabicText = ''
          let englishText = ''
          let book = ''
          let hadithInBook = hadithNum
          
          if (englishResult.status === 'fulfilled' && englishResult.value) {
            const englishData = englishResult.value
            // Log structure for debugging (first few only)
            if (hadithNum <= 3) {
              console.log(`English hadith ${hadithNum} structure:`, englishData)
            }
            
            // Try multiple possible API structures
            // Check for hadiths (plural) first - this is the actual structure from the API
            if (englishData && Array.isArray(englishData.hadiths) && englishData.hadiths.length > 0) {
              const hadith = englishData.hadiths[0]
              englishText = hadith.text || ''
              if (hadith.reference) {
                book = hadith.reference.book || ''
                hadithInBook = hadith.reference.hadith || hadithNum
              }
            } else if (englishData && Array.isArray(englishData.hadith) && englishData.hadith.length > 0) {
              const hadith = englishData.hadith[0]
              englishText = hadith.text || ''
              if (hadith.reference) {
                book = hadith.reference.book || ''
                hadithInBook = hadith.reference.hadith || hadithNum
              }
            } else if (englishData && englishData.text) {
              // Direct text property
              englishText = englishData.text || ''
            } else if (englishData && englishData.hadithNumber && englishData.text) {
              // Structure with hadithNumber and text
              englishText = englishData.text || ''
            } else if (englishData && typeof englishData === 'string') {
              // Direct string response
              englishText = englishData
            } else if (englishData && englishData.collection) {
              // Collection structure
              if (Array.isArray(englishData.collection) && englishData.collection.length > 0) {
                englishText = englishData.collection[0].text || englishData.collection[0].hadith || ''
              }
            } else if (englishData && englishData.data) {
              // Nested data structure
              if (Array.isArray(englishData.data) && englishData.data.length > 0) {
                englishText = englishData.data[0].text || englishData.data[0].hadith || ''
              } else if (englishData.data.text) {
                englishText = englishData.data.text || ''
              }
            }
          } else if (englishResult.status === 'rejected') {
            console.log(`Failed to fetch English hadith ${hadithNum}:`, englishResult.reason)
          }
          
          if (arabicResult.status === 'fulfilled' && arabicResult.value) {
            const arabicData = arabicResult.value
            if (hadithNum <= 3) {
              console.log(`Arabic hadith ${hadithNum} structure:`, arabicData)
            }
            
            // Try multiple possible API structures
            // Check for hadiths (plural) first - this is the actual structure from the API
            if (arabicData && Array.isArray(arabicData.hadiths) && arabicData.hadiths.length > 0) {
              arabicText = arabicData.hadiths[0].text || ''
            } else if (arabicData && Array.isArray(arabicData.hadith) && arabicData.hadith.length > 0) {
              arabicText = arabicData.hadith[0].text || ''
            } else if (arabicData && arabicData.text) {
              arabicText = arabicData.text || ''
            } else if (arabicData && arabicData.hadithNumber && arabicData.text) {
              arabicText = arabicData.text || ''
            } else if (arabicData && typeof arabicData === 'string') {
              arabicText = arabicData
            } else if (arabicData && arabicData.collection) {
              if (Array.isArray(arabicData.collection) && arabicData.collection.length > 0) {
                arabicText = arabicData.collection[0].text || arabicData.collection[0].hadith || ''
              }
            } else if (arabicData && arabicData.data) {
              if (Array.isArray(arabicData.data) && arabicData.data.length > 0) {
                arabicText = arabicData.data[0].text || arabicData.data[0].hadith || ''
              } else if (arabicData.data.text) {
                arabicText = arabicData.data.text || ''
              }
            }
          }
          
          // Add hadith if we have at least English text
          if (englishText || arabicText) {
            hadithsList.push({
              id: `${collectionId}_${hadithNum}`,
              number: hadithNum,
              collection: collectionId,
              arabic: arabicText,
              english: englishText,
              book: book,
              hadithInBook: hadithInBook
            })
            
            translationsMap[`${collectionId}_${hadithNum}`] = {
              en: englishText || 'Translation not available',
              bn: englishText || 'অনুবাদ পাওয়া যায়নি' // Using English as fallback for Bengali
            }
          } else if (hadithNum <= 5) {
            // Log first few failures for debugging with full structure
            console.log(`No data extracted for hadith ${hadithNum}:`, {
              english: englishResult.status,
              arabic: arabicResult.status,
              englishData: englishResult.status === 'fulfilled' ? JSON.stringify(englishResult.value, null, 2) : null,
              arabicData: arabicResult.status === 'fulfilled' ? JSON.stringify(arabicResult.value, null, 2) : null
            })
          }
        })
        }
      }
      
      console.log('Total hadiths fetched:', hadithsList.length)
      
      setHadiths(hadithsList)
      setTranslations(translationsMap)
    } catch (error) {
      console.error('Error fetching hadiths:', error)
      setHadiths([])
      setTranslations({})
    } finally {
      setHadithLoading(false)
      setLoading(false)
    }
  }

  const fetchHadithProgress = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_type', 'hadith')

      if (error) throw error

      const progressMap = {}
      data?.forEach(item => {
        const key = `${item.hadith_collection}_${item.hadith_number}`
        progressMap[key] = item
      })
      setProgress(prev => ({ ...prev, ...progressMap }))
    } catch (error) {
      console.error('Error fetching hadith progress:', error)
    }
  }

  const saveProgress = async (surahNumber, ayahNumber = null) => {
    if (!user) return

    try {
      const key = `${surahNumber}_${ayahNumber}`
      // Preserve existing completed status
      const existingProgress = progress[key]
      const isCompleted = existingProgress?.completed || false

      const progressData = {
        user_id: user.id,
        content_type: 'quran',
        surah_number: surahNumber,
        ayah_number: ayahNumber,
        last_read_at: new Date().toISOString(),
        audio_position: audioRef.current?.currentTime || 0,
        completed: isCompleted // Preserve completed status
      }

      const { error } = await supabase
        .from('reading_progress')
        .upsert(progressData, {
          onConflict: 'user_id,content_type,surah_number,hadith_collection,hadith_number,ayah_number'
        })

      if (error) throw error

      // Update local progress state, preserving completed status
      setProgress(prev => ({
        ...prev,
        [key]: { ...prev[key], ...progressData }
      }))
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const handlePlayAyah = async (ayah) => {
    try {
      // If clicking the same ayah that's currently playing, toggle play/pause
      if (currentAyah?.id === ayah.id && audioRef.current) {
        if (isPlaying) {
          // If playing, pause it
          handlePause()
        } else {
          // If paused, resume it
          await audioRef.current.play()
          setIsPlaying(true)
        }
        return
      }

      setAudioLoading(true)
      setCurrentAyah(ayah)
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
      
      // Using same API as Note page (alquran.cloud)
      const audioApiUrl = getAudioUrl(ayah.chapter_number, ayah.verse_number)
      
      try {
        const response = await fetch(audioApiUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        
        // Al-Quran Cloud API returns: { code: 200, data: { audio: "url", audioSecondary: ["url1", "url2"] } }
        const audioFileUrl = data?.data?.audio || 
                             data?.data?.audioSecondary?.[0]
        
        if (!audioFileUrl) {
          throw new Error('Audio URL not found in API response')
        }
        
        setAudioUrl(audioFileUrl)

        // Wait for audio to load
        if (audioRef.current) {
          audioRef.current.src = audioFileUrl
          audioRef.current.load()
          
          // Reset to beginning when playing a new ayah (or restarting the same one)
          audioRef.current.currentTime = 0

          await audioRef.current.play()
          setIsPlaying(true)
          saveProgress(ayah.chapter_number, ayah.verse_number)

          // Track progress every second
          progressIntervalRef.current = setInterval(() => {
            if (audioRef.current && isPlaying) {
              saveProgress(ayah.chapter_number, ayah.verse_number)
            }
          }, 1000)
        }
      } catch (fetchError) {
        console.error('Error fetching audio URL:', fetchError)
        alert('Error loading audio. Please try again.')
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      alert('Error loading audio. Please try again.')
    } finally {
      setAudioLoading(false)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (currentAyah) {
        saveProgress(currentAyah.chapter_number, currentAyah.verse_number)
      }
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const playNextAyah = async () => {
    if (!currentAyah || !ayahs.length) return

    // Find current ayah index
    const currentIndex = ayahs.findIndex(ayah => ayah.id === currentAyah.id)
    
    // If there's a next ayah, play it
    if (currentIndex >= 0 && currentIndex < ayahs.length - 1) {
      const nextAyah = ayahs[currentIndex + 1]
      await handlePlayAyah(nextAyah)
    }
  }

  const handleAudioEnded = async () => {
    setIsPlaying(false)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    if (currentAyah) {
      // Mark as completed
      saveProgress(currentAyah.chapter_number, currentAyah.verse_number)
      
      // If autoplay is enabled, play next ayah
      if (autoplay) {
        await playNextAyah()
      }
    }
  }

  const markAsCompleted = async (surahNumber, ayahNumber = null) => {
    if (!user) return

    const key = `${surahNumber}_${ayahNumber}`
    const isCurrentlyCompleted = progress[key]?.completed || false

    try {
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          content_type: 'quran',
          surah_number: surahNumber,
          ayah_number: ayahNumber,
          completed: !isCurrentlyCompleted, // Toggle completion
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,content_type,surah_number,hadith_collection,hadith_number,ayah_number'
        })

      if (error) throw error

      // Update local progress state
      setProgress(prev => ({
        ...prev,
        [key]: { ...prev[key], completed: !isCurrentlyCompleted }
      }))
    } catch (error) {
      console.error('Error marking as completed:', error)
    }
  }

  const isAyahCompleted = (surahNumber, ayahNumber) => {
    const key = `${surahNumber}_${ayahNumber}`
    return progress[key]?.completed || false
  }

  const markHadithAsCompleted = async (collectionId, hadithNumber) => {
    if (!user) return

    const key = `${collectionId}_${hadithNumber}`
    const isCurrentlyCompleted = progress[key]?.completed || false

    try {
      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          content_type: 'hadith',
          hadith_collection: collectionId,
          hadith_number: hadithNumber,
          completed: !isCurrentlyCompleted,
          last_read_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,content_type,surah_number,hadith_collection,hadith_number,ayah_number'
        })

      if (error) throw error

      setProgress(prev => ({
        ...prev,
        [key]: { ...prev[key], completed: !isCurrentlyCompleted }
      }))
    } catch (error) {
      console.error('Error marking hadith as completed:', error)
    }
  }

  const isHadithCompleted = (collectionId, hadithNumber) => {
    const key = `${collectionId}_${hadithNumber}`
    return progress[key]?.completed || false
  }

  if (loading && activeTab === 'quran' && !selectedSurah && surahs.length === 0) {
    return (
      <div className="quran-reader-page">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (loading && activeTab === 'hadith' && !selectedCollection && hadithCollections.length === 0) {
    return (
      <div className="quran-reader-page">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="quran-reader-page">
      <SEO
        title="Read - Quran & Hadith"
        description="Read Quran and Hadith with audio playback, track your reading progress, and enhance your Islamic studies on QuranNerds."
        keywords="Quran reader, Hadith reader, Islamic studies, Quran audio, reading progress"
      />
      
      <div className="quran-reader-container">
        <div className="reader-sidebar">
          <div className="reader-tabs">
            <button
              className={`reader-tab ${activeTab === 'quran' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('quran')
                setSidebarOpen(!sidebarOpen) // Toggle list on mobile
              }}
            >
              <BookOpen size={18} />
              <span>Quran</span>
            </button>
            <button
              className={`reader-tab ${activeTab === 'hadith' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('hadith')
                setSidebarOpen(!sidebarOpen) // Toggle list on mobile
              }}
            >
              <Book size={18} />
              <span>Hadith</span>
            </button>
          </div>
          
          <div className={`surah-list-container ${sidebarOpen ? 'mobile-open' : ''}`}>

          {activeTab === 'quran' ? (
            <div className="surah-list">
              <div className="surah-list-title-wrapper">
                <h3 className="surah-list-title">Surahs</h3>
                <button 
                  className="mobile-sidebar-close"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close list"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="surah-list-content">
                {surahs.map((surah) => {
                  const surahNum = getSurahNumber(surah)
                  const selectedNum = selectedSurah ? getSurahNumber(selectedSurah) : null
                  // Strict comparison: only active if both numbers exist and are equal
                  const isActive = selectedNum !== null && surahNum !== null && selectedNum === surahNum
                  return (
                    <button
                      key={surah.id || surahNum}
                      className={`surah-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedSurah(surah)
                        setSidebarOpen(false) // Close sidebar on mobile after selection
                      }}
                    >
                      <div className="surah-number">{surahNum}</div>
                      <div className="surah-info">
                        <div className="surah-name">{surah.name_simple || `Surah ${surahNum}`}</div>
                        <div className="surah-verse-count">{surah.verses_count || 0} verses</div>
                      </div>
                      {progress[`${surahNum}_all`]?.completed && (
                        <CheckCircle size={18} className="completed-icon" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="surah-list">
              <div className="surah-list-title-wrapper">
                <h3 className="surah-list-title">Hadith Collections</h3>
                  <button 
                    className="mobile-sidebar-close"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close list"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="surah-list-content">
                {hadithCollections.map((collection) => {
                  const isActive = selectedCollection?.id === collection.id
                  return (
                    <button
                      key={collection.id}
                      className={`surah-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCollection(collection)
                        setSelectedSurah(null) // Clear surah selection
                        setAyahs([]) // Clear ayahs
                        setHadiths([]) // Clear previous hadiths
                        setSidebarOpen(false) // Close sidebar on mobile after selection
                        // fetchHadiths will be called by useEffect
                      }}
                    >
                      <div className="surah-number">{collection.id.charAt(0).toUpperCase()}</div>
                      <div className="surah-info">
                        <div className="surah-name">{collection.name}</div>
                        <div className="surah-verse-count">{collection.total} hadiths</div>
                      </div>
                      {progress[`${collection.id}_all`]?.completed && (
                        <CheckCircle size={18} className="completed-icon" />
                      )}
                    </button>
                  )
                })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="reader-content">
          {activeTab === 'quran' && selectedSurah ? (
            <>
              <div className="surah-header">
                <div className="surah-title-row">
                  <div className="surah-title-group">
                    <h1 className="surah-title">
                      {selectedSurah.name_simple}
                      {selectedSurah.name_arabic && (
                        <span className="surah-title-arabic">{selectedSurah.name_arabic}</span>
                      )}
                    </h1>
                    <p className="surah-info-text">
                      {selectedSurah.verses_count} verses • Chapter {selectedSurah.chapter_number}
                    </p>
                  </div>
                  <div className="translation-controls">
                    <label className="translation-toggle">
                      <input
                        type="checkbox"
                        checked={showTranslation}
                        onChange={(e) => setShowTranslation(e.target.checked)}
                      />
                      <span>Show Translation</span>
                    </label>
                    {showTranslation && (
                      <div className="translation-lang-select">
                        <button
                          className={`lang-btn ${translationLang === 'en' ? 'active' : ''}`}
                          onClick={() => setTranslationLang('en')}
                        >
                          English
                        </button>
                        <button
                          className={`lang-btn ${translationLang === 'bn' ? 'active' : ''}`}
                          onClick={() => setTranslationLang('bn')}
                        >
                          বাংলা
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ayahs-container">
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  ayahs.map((ayah) => (
                    <div
                      key={ayah.id}
                      className={`ayah-item ${currentAyah?.id === ayah.id ? 'playing' : ''} ${isAyahCompleted(ayah.chapter_number, ayah.verse_number) ? 'completed' : ''}`}
                    >
                      <div className="ayah-header">
                        <span className="ayah-number">{ayah.verse_number || ayah.number || ''}</span>
                        <div className="ayah-actions">
                          <button
                            className="ayah-play-btn"
                            onClick={() => handlePlayAyah(ayah)}
                            disabled={audioLoading}
                            title="Play audio"
                          >
                            {currentAyah?.id === ayah.id && isPlaying ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                          </button>
                          {user && (
                            <button
                              className={`ayah-complete-btn ${isAyahCompleted(ayah.chapter_number, ayah.verse_number) ? 'completed' : ''}`}
                              onClick={() => markAsCompleted(ayah.chapter_number, ayah.verse_number)}
                              title={isAyahCompleted(ayah.chapter_number, ayah.verse_number) ? 'Mark as incomplete' : 'Mark as completed'}
                            >
                              <CheckCircle
                                size={18}
                                fill={isAyahCompleted(ayah.chapter_number, ayah.verse_number) ? 'currentColor' : 'none'}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="ayah-content">
                        <div className="ayah-text" dir="rtl" lang="ar">
                          {ayah.text_uthmani || ayah.text || 'Loading...'}
                        </div>
                        {showTranslation && translations[ayah.id] && (
                          <div className={`ayah-translation ${translationLang === 'bn' ? 'bangla' : 'english'}`}>
                            {translations[ayah.id][translationLang] || translations[ayah.id].en || 'Translation not available'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : activeTab === 'hadith' && selectedCollection ? (
            <>
              <div className="surah-header">
                <div className="surah-title-row">
                  <div className="surah-title-group">
                    <h1 className="surah-title">
                      {selectedCollection.name}
                      {selectedCollection.nameArabic && (
                        <span className="surah-title-arabic">{selectedCollection.nameArabic}</span>
                      )}
                    </h1>
                    <p className="surah-info-text">
                      {selectedCollection.total} hadiths • Collection
                    </p>
                  </div>
                  <div className="translation-controls">
                    <label className="translation-toggle">
                      <input
                        type="checkbox"
                        checked={showTranslation}
                        onChange={(e) => setShowTranslation(e.target.checked)}
                      />
                      <span>Show Translation</span>
                    </label>
                    {showTranslation && (
                      <div className="translation-lang-select">
                        <button
                          className={`lang-btn ${translationLang === 'en' ? 'active' : ''}`}
                          onClick={() => setTranslationLang('en')}
                        >
                          English
                        </button>
                        <button
                          className={`lang-btn ${translationLang === 'bn' ? 'active' : ''}`}
                          onClick={() => setTranslationLang('bn')}
                        >
                          বাংলা
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ayahs-container">
                {hadithLoading ? (
                  <div className="loading-spinner"></div>
                ) : hadiths.length === 0 ? (
                  <div className="reader-welcome">
                    <p>No hadiths found. Please try again.</p>
                  </div>
                ) : (
                  hadiths.map((hadith) => (
                    <div
                      key={hadith.id}
                      className={`ayah-item ${isHadithCompleted(hadith.collection, hadith.number) ? 'completed' : ''}`}
                    >
                      <div className="ayah-header">
                        <span className="ayah-number">{hadith.number}</span>
                        <div className="ayah-actions">
                          {user && (
                            <button
                              className={`ayah-complete-btn ${isHadithCompleted(hadith.collection, hadith.number) ? 'completed' : ''}`}
                              onClick={() => markHadithAsCompleted(hadith.collection, hadith.number)}
                              title={isHadithCompleted(hadith.collection, hadith.number) ? 'Mark as incomplete' : 'Mark as completed'}
                            >
                              <CheckCircle
                                size={18}
                                fill={isHadithCompleted(hadith.collection, hadith.number) ? 'currentColor' : 'none'}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="ayah-content">
                        {hadith.arabic ? (
                          <div className="ayah-text" dir="rtl" lang="ar">
                            {hadith.arabic}
                          </div>
                        ) : hadith.english ? (
                          <div className="ayah-text" dir="ltr" lang="en" style={{ textAlign: 'left', direction: 'ltr' }}>
                            {hadith.english}
                          </div>
                        ) : null}
                        {showTranslation && hadith.arabic && translations[hadith.id] && (
                          <div className={`ayah-translation ${translationLang === 'bn' ? 'bangla' : 'english'}`}>
                            {translations[hadith.id][translationLang] || translations[hadith.id].en || 'Translation not available'}
                          </div>
                        )}
                        {!hadith.arabic && hadith.english && showTranslation && (
                          <div className="ayah-translation english" style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px', fontStyle: 'italic' }}>
                            English Translation
                          </div>
                        )}
                        {hadith.book && (
                          <div className="ayah-translation english" style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                            Book {hadith.book}, Hadith {hadith.hadithInBook}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="reader-welcome">
              <BookOpen size={64} className="welcome-icon" />
              <h2>Welcome to Read</h2>
              <p>{activeTab === 'quran' ? 'Select a surah from the sidebar to start reading' : 'Select a hadith collection from the sidebar to start reading'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="audio-player">
          <div className="audio-player-content">
            <button
              className="audio-control-btn"
              onClick={isPlaying ? handlePause : () => audioRef.current?.play()}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <div className="audio-info">
              {currentAyah && (
                <div className="audio-track-info">
                  <span className="audio-surah">{selectedSurah?.name_simple}</span>
                  <span className="audio-ayah">Ayah {currentAyah.verse_number}</span>
                </div>
              )}
              <input
                type="range"
                min="0"
                max="100"
                value={audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0}
                className="audio-progress"
                style={{
                  '--progress-width': `${audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0}%`
                }}
                onChange={(e) => {
                  if (audioRef.current && audioDuration > 0) {
                    const newTime = (e.target.value / 100) * audioDuration
                    audioRef.current.currentTime = newTime
                    setAudioProgress(newTime)
                  }
                }}
              />
            </div>

            <div className="audio-controls">
              <label className="audio-autoplay-toggle" title="Autoplay next ayah">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />
                <span>Autoplay</span>
              </label>
              <button
                className="audio-volume-btn"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="audio-volume"
              />
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setAudioDuration(audioRef.current.duration)
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            // Use requestAnimationFrame for smoother updates
            requestAnimationFrame(() => {
              if (audioRef.current) {
                setAudioProgress(audioRef.current.currentTime)
              }
            })
            // Auto-save progress
            if (currentAyah) {
              const currentTime = audioRef.current.currentTime
              const duration = audioRef.current.duration
              if (duration && currentTime > 0 && Math.floor(currentTime) % 5 === 0) {
                // Save every 5 seconds
                saveProgress(currentAyah.chapter_number, currentAyah.verse_number)
              }
            }
          }
        }}
      />
    </div>
  )
}

export default QuranReader
