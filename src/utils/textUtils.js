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

