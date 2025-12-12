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

  // Get all direct child divs
  const divs = Array.from(tempDiv.querySelectorAll('div'))
  
  let processedHTML = ''
  let currentVerse = null
  let verseParts = []
  let i = 0

  while (i < divs.length) {
    const div = divs[i]
    const text = div.textContent.trim()
    const innerHTML = div.innerHTML.trim()

    // Skip empty divs (like <div><br></div>)
    if (!text || text === '<br>' || text === '') {
      // If we have a verse in progress, keep it open
      // Otherwise, add empty div as is
      if (!currentVerse) {
        processedHTML += `<div>${innerHTML}</div>`
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
        // Don't increment i, process this div again as regular content
        continue
      } else {
        // No Arabic found yet, discard this verse and process as regular
        currentVerse = null
        verseParts = []
      }
    }

    // Regular content - add as is
    processedHTML += `<div>${innerHTML}</div>`
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

/**
 * Builds HTML for a Quranic verse block
 * @param {Object} verse - Verse object with reference
 * @param {Array} parts - Array of verse parts (arabic, english, bangla)
 * @returns {string} HTML string for the verse
 */
function buildVerseHTML(verse, parts) {
  let html = '<div class="quran-verse">'
  
  if (verse.reference) {
    html += `<div class="verse-header"><span class="verse-reference">${verse.reference}</span></div>`
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

