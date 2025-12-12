/**
 * Strips HTML tags from a string and returns plain text
 * @param {string} html - HTML string to strip
 * @param {number} maxLength - Maximum length of the returned text (optional)
 * @returns {string} Plain text without HTML tags
 */
export function stripHTML(html) {
  if (!html) return ''
  
  // Create a temporary DOM element to parse HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  
  // Get text content and clean up whitespace
  let text = tmp.textContent || tmp.innerText || ''
  
  // Replace multiple whitespaces with single space
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}

/**
 * Gets a plain text excerpt from HTML content
 * @param {string} html - HTML string
 * @param {number} maxLength - Maximum length of excerpt
 * @returns {string} Plain text excerpt
 */
export function getExcerpt(html, maxLength = 200) {
  const text = stripHTML(html)
  
  if (text.length <= maxLength) {
    return text
  }
  
  // Truncate at word boundary
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

/**
 * Detects if text contains Arabic characters
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains Arabic characters
 */
function containsArabic(text) {
  // Arabic Unicode range: \u0600-\u06FF
  return /[\u0600-\u06FF]/.test(text)
}

/**
 * Detects if text contains Bengali (Bangla) characters
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains Bengali characters
 */
function containsBengali(text) {
  // Bengali Unicode range: \u0980-\u09FF
  return /[\u0980-\u09FF]/.test(text)
}

/**
 * Detects if text is a Surah reference (e.g., "Al-Baqara 62" or "Al-Baqara 1-4")
 * @param {string} text - Text to check
 * @returns {boolean} True if text looks like a Surah reference
 */
function isSurahReference(text) {
  const trimmed = text.trim()
  
  // More flexible pattern: Any text (surah name) followed by space and number(s)
  // Handles: "Al-Baqara 62", "Al-Fatiha 1", "Al-Baqara 1-4", "An-Nisa 1-5", etc.
  // Also handles: "Surah Al-Baqara 62", "Al Baqara 62", etc.
  
  // Pattern: Start with letters/spaces/hyphens/apostrophes (surah name)
  // Then one or more spaces
  // Then either: single number OR number-number (range)
  // Must end with the number part
  const pattern = /^[A-Za-z\s'-]+\s+\d+(-\d+)?$/
  
  // Additional check: must have at least one letter (surah name) and at least one digit
  const hasLetters = /[A-Za-z]/.test(trimmed)
  const hasDigits = /\d/.test(trimmed)
  const reasonableLength = trimmed.length > 3 && trimmed.length < 60
  
  return pattern.test(trimmed) && hasLetters && hasDigits && reasonableLength
}

/**
 * Detects if text starts with a translation label or contains translation content
 * @param {string} html - HTML text to check
 * @param {string} text - Plain text to check
 * @returns {string|null} Returns "english", "bangla", or null
 */
function getTranslationType(html, text) {
  const trimmedHTML = html.trim()
  const trimmedText = text.trim()
  
  // Check for explicit labels
  if (/^<strong>English:<\/strong>/i.test(trimmedHTML) || /^English:/i.test(trimmedHTML) || /^English:/i.test(trimmedText)) {
    return 'english'
  }
  if (/^<strong>বাংলা:<\/strong>/i.test(trimmedHTML) || /^বাংলা:/i.test(trimmedHTML) || /^বাংলা:/i.test(trimmedText)) {
    return 'bangla'
  }
  
  // If no label but contains Bengali characters, it's likely a Bangla translation
  if (containsBengali(trimmedText) && trimmedText.length > 10 && !containsArabic(trimmedText)) {
    return 'bangla'
  }
  
  return null
}

/**
 * Processes HTML content to detect and style Quranic verses
 * Automatically wraps Surah references, Arabic text, and translations
 * @param {string} html - HTML content from Quill
 * @returns {string} Processed HTML with proper styling classes
 */
export function processQuranicContent(html) {
  if (!html) return html

  try {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html

    // First, preserve all existing quran-verse divs
    const existingVerses = tempDiv.querySelectorAll('.quran-verse')
    existingVerses.forEach(verse => {
      // Mark as already processed
      verse.setAttribute('data-processed', 'true')
    })

    // Get all direct children (divs, paragraphs, and other block elements)
    const rootElements = Array.from(tempDiv.children)
    
    let processedHTML = ''
    let currentVerse = null
    let verseParts = []
    let i = 0

    while (i < rootElements.length) {
      const element = rootElements[i]
      
      // If this is already a processed quran-verse, preserve it as-is
      if (element.classList.contains('quran-verse') || element.getAttribute('data-processed') === 'true') {
        processedHTML += element.outerHTML
        i++
        continue
      }
      
      const text = element.textContent.trim()
      const innerHTML = element.innerHTML.trim()
      const tagName = element.tagName

      // Handle elements with only <br> tags inside (like <p><br></p> or <div><br></div>)
      if ((!text || text === '') && (innerHTML === '<br>' || innerHTML.trim() === '<br>')) {
        // If we have a verse in progress, keep it open
        // Otherwise, preserve the element with br as is
        if (!currentVerse) {
          processedHTML += element.outerHTML
        }
        i++
        continue
      }
      
      // Skip completely empty elements
      if (!text && innerHTML.trim() === '') {
        if (!currentVerse) {
          processedHTML += element.outerHTML
        }
        i++
        continue
      }

    // Check if this is a Surah reference
    if (isSurahReference(text) && !containsArabic(text)) {
      // If we have a verse in progress, close it
      if (currentVerse) {
        processedHTML += buildVerseHTML(currentVerse, verseParts)
        verseParts = []
      }
      
      // Start a new verse
      currentVerse = {
        reference: text
      }
      i++
      continue
    }

    // If we have a verse in progress, check for verse components
    if (currentVerse) {
      // Check if this is Arabic text
      if (containsArabic(text) && text.length > 10) {
        verseParts.push({ type: 'arabic', content: innerHTML })
        i++
        continue
      }

      // Check if this is a translation (English or Bangla)
      const translationType = getTranslationType(innerHTML, text)
      if (translationType) {
        // Keep the label in the content if it exists
        verseParts.push({ 
          type: translationType, 
          content: innerHTML
        })
        i++
        continue
      }

      // If this doesn't match verse patterns, close the verse
      // But only if we have at least Arabic text (a complete verse)
      const hasArabic = verseParts.some(p => p.type === 'arabic')
      if (hasArabic) {
        processedHTML += buildVerseHTML(currentVerse, verseParts)
        currentVerse = null
        verseParts = []
        // Don't increment i, process this element again as regular content
        continue
      } else {
        // No Arabic found yet, discard this verse and process as regular
        currentVerse = null
        verseParts = []
      }
    }

    // Regular content - process br tags inside p tags
    if (tagName === 'P' && innerHTML.includes('<br>')) {
      // Normalize br tags: convert <p><br></p> to <p><br></p> (keep as is)
      // But ensure multiple brs are handled properly
      const normalizedHTML = innerHTML.replace(/<br\s*\/?>/gi, '<br>')
      processedHTML += `<p>${normalizedHTML}</p>`
    } else {
      // Preserve the original tag
      processedHTML += element.outerHTML
    }
    i++
  }

    // Close any remaining verse
    if (currentVerse) {
      processedHTML += buildVerseHTML(currentVerse, verseParts)
    }

    return processedHTML || html
  } catch (error) {
    console.error('Error processing Quranic content:', error)
    // Return original HTML if processing fails
    return html
  }
}

// Cache for surah data from Al-Quran Cloud API
let surahCache = null
let surahCachePromise = null

/**
 * Fetches all surahs from Al-Quran Cloud API and caches them
 * Uses the same API as the editor (api.alquran.cloud)
 * @returns {Promise<Object>} Promise that resolves to surah map { name: number }
 */
async function fetchSurahMap() {
  if (surahCache) {
    return surahCache
  }

  if (surahCachePromise) {
    return surahCachePromise
  }

  surahCachePromise = fetch('https://api.alquran.cloud/v1/surah')
    .then(response => response.json())
    .then(data => {
      if (data.code === 200 && data.data) {
        const map = {}
        data.data.forEach(surah => {
          if (surah.number && surah.englishName) {
            // Normalize surah name for matching
            const normalized = surah.englishName.toLowerCase().trim()
            map[normalized] = surah.number
            
            // Also add without "Al-", "An-", "At-", "As-" prefixes for flexibility
            const withoutPrefix = normalized.replace(/^(al-|an-|at-|as-)/, '')
            if (withoutPrefix !== normalized) {
              map[withoutPrefix] = surah.number
            }
            
            // Add name without spaces/hyphens
            const noSpaces = normalized.replace(/[\s-]/g, '')
            if (noSpaces !== normalized) {
              map[noSpaces] = surah.number
            }
          }
        })
        surahCache = map
        return map
      }
      throw new Error('Failed to fetch surah data')
    })
    .catch(error => {
      surahCachePromise = null
      return null
    })

  return surahCachePromise
}

/**
 * Maps surah names to surah numbers using Al-Quran Cloud API
 * Uses the same API as the editor (api.alquran.cloud)
 * @param {string} surahName - Name of the surah
 * @returns {Promise<number|null>} Promise that resolves to surah number or null if not found
 */
async function getSurahNumber(surahName) {
  const map = await fetchSurahMap()
  if (!map) return null
  
  const normalized = surahName.toLowerCase().trim().replace(/\s+/g, ' ')
  
  // Try exact match first
  if (map[normalized]) {
    return map[normalized]
  }
  
  // Try without "Surah" prefix
  const withoutSurah = normalized.replace(/^surah\s+/, '')
  if (withoutSurah !== normalized && map[withoutSurah]) {
    return map[withoutSurah]
  }
  
  // Try matching by removing common prefixes
  const withoutPrefix = normalized.replace(/^(al-|an-|at-|as-)/, '')
  if (withoutPrefix !== normalized && map[withoutPrefix]) {
    return map[withoutPrefix]
  }
  
  // Try without spaces/hyphens
  const noSpaces = normalized.replace(/[\s-]/g, '')
  if (map[noSpaces]) {
    return map[noSpaces]
  }
  
  // Try handling common spelling variations (e.g., Faatiha vs Fatiha)
  const withVariations = normalized
    .replace(/aa/g, 'a')  // Faatiha -> Fatiha
    .replace(/ee/g, 'e')  // Other variations
    .replace(/oo/g, 'o')
  if (withVariations !== normalized && map[withVariations]) {
    return map[withVariations]
  }
  
  // Try with variations and without prefix
  const withoutPrefixVariations = withoutPrefix
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'e')
    .replace(/oo/g, 'o')
  if (withoutPrefixVariations !== withoutPrefix && map[withoutPrefixVariations]) {
    return map[withoutPrefixVariations]
  }
  
  return null
}

/**
 * Parses verse reference to extract surah and ayah numbers
 * @param {string} reference - Verse reference like "Al-Baqara 62" or "Al-Baqara 60-62"
 * @returns {Promise<Object|null>} Promise that resolves to object with surah and ayah numbers, or null if parsing fails
 */
export async function parseVerseReference(reference) {
  if (!reference) return null
  
  // Match pattern: "Surah Name" followed by space and number(s)
  // Handles: "Al-Baqara 62", "Al-Baqara 60-62", "Surah Al-Baqara 62", etc.
  const match = reference.match(/^(?:surah\s+)?([a-z\s'-]+)\s+(\d+)(?:-(\d+))?$/i)
  
  if (!match) return null
  
  const surahName = match[1].trim()
  const surahNumber = await getSurahNumber(surahName)
  
  if (!surahNumber) return null
  
  const startAyah = parseInt(match[2], 10)
  const endAyah = match[3] ? parseInt(match[3], 10) : startAyah
  
  return {
    surah: surahNumber,
    startAyah: startAyah,
    endAyah: endAyah
  }
}

/**
 * Gets audio API endpoint for a verse from Al-Quran Cloud API (Al-Afasy reciter)
 * Uses the same API as the editor (api.alquran.cloud)
 * @param {number} surah - Surah number (1-114)
 * @param {number} ayah - Ayah number
 * @returns {string} API endpoint URL
 */
export function getAudioUrl(surah, ayah) {
  // Al-Quran Cloud API format: https://api.alquran.cloud/v1/ayah/{surah}:{ayah}/ar.alafasy
  return `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`
}

/**
 * Builds HTML for a Quranic verse block
 * @param {Object} verse - Verse object with reference
 * @param {Array} parts - Array of verse parts (arabic, english, bangla)
 * @returns {string} HTML string for the verse
 */
function buildVerseHTML(verse, parts) {
  let html = '<div class="quran-verse">'
  
  if (verse.reference) {
    // Store reference for async parsing later - audio buttons will be added dynamically
    // Escape the reference to prevent XSS
    const escapedReference = verse.reference.replace(/"/g, '&quot;')
    html += `<div class="verse-header" data-verse-reference="${escapedReference}">
      <span class="verse-reference">${verse.reference}</span>
    </div>`
  }

  // Add Arabic text
  const arabicPart = parts.find(p => p.type === 'arabic')
  if (arabicPart) {
    html += `<div class="verse-arabic">${arabicPart.content}</div>`
  }

  // Add translations
  const englishPart = parts.find(p => p.type === 'english')
  const banglaPart = parts.find(p => p.type === 'bangla')
  
  if (englishPart || banglaPart) {
    html += '<div class="verse-translation">'
    if (englishPart) {
      html += `<p class="verse-english">${englishPart.content}</p>`
    }
    if (banglaPart) {
      html += `<p class="verse-bangla">${banglaPart.content}</p>`
    }
    html += '</div>'
  }

  html += '</div>'
  return html
}

/**
 * Creates a URL-friendly slug from a title
 * @param {string} title - Title to convert to slug
 * @returns {string} URL-friendly slug
 */
export function createSlug(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Creates a slug for a note: title + last 4 digits of ID
 * @param {string} title - Note title
 * @param {string} id - Note ID (UUID)
 * @returns {string} Slug like "my-note-title-1234"
 */
export function createNoteSlug(title, id) {
  const titleSlug = createSlug(title)
  const lastFour = id ? id.slice(-4) : ''
  return titleSlug ? `${titleSlug}-${lastFour}` : lastFour
}

/**
 * Extracts the ID from a note slug
 * @param {string} slug - Note slug
 * @returns {string} Last 4 digits of ID
 */
export function extractIdFromSlug(slug) {
  if (!slug) return null
  const parts = slug.split('-')
  const lastPart = parts[parts.length - 1]
  // Check if last part is 4 characters (likely the ID suffix)
  if (lastPart && lastPart.length === 4 && /^[a-f0-9]{4}$/i.test(lastPart)) {
    return lastPart
  }
  return null
}

/**
 * Creates a slug for a user profile from name
 * @param {string} name - User name
 * @returns {string} Slug like "john-doe"
 */
export function createProfileSlug(name) {
  if (!name) return ''
  return createSlug(name)
}

