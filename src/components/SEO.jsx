import { useEffect } from 'react'

function SEO({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  author,
  publishedTime,
  modifiedTime
}) {
  useEffect(() => {
    // Set document title
    const fullTitle = title ? `${title} | QuranNerds` : 'QuranNerds - Study & Share Quranic Knowledge'
    document.title = fullTitle

    // Get base URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : baseUrl)
    const defaultImage = `${baseUrl}/quran-icon.png`

    // Update or create meta tags
    const setMetaTag = (name, content, isProperty = false) => {
      if (!content) return
      
      const attribute = isProperty ? 'property' : 'name'
      let meta = document.querySelector(`meta[${attribute}="${name}"]`)
      
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute(attribute, name)
        document.head.appendChild(meta)
      }
      
      meta.setAttribute('content', content)
    }

    // Basic meta tags - only use provided values, no fallbacks
    if (description) {
      setMetaTag('description', description)
    }
    if (keywords) {
      setMetaTag('keywords', keywords)
    }
    if (author) {
      setMetaTag('author', author)
    }
    
    // Open Graph tags - use provided data, only fallback for image
    if (title) {
      setMetaTag('og:title', title, true)
    }
    if (description) {
      setMetaTag('og:description', description, true)
    }
    setMetaTag('og:type', type, true)
    setMetaTag('og:url', currentUrl, true)
    const ogImage = image || defaultImage
    setMetaTag('og:image', ogImage, true)
    if (title) {
      setMetaTag('og:image:alt', title, true)
    }
    setMetaTag('og:site_name', 'QuranNerds', true)
    setMetaTag('og:locale', 'en_US', true)
    
    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image')
    if (title) {
      setMetaTag('twitter:title', title)
    }
    if (description) {
      setMetaTag('twitter:description', description)
    }
    setMetaTag('twitter:image', ogImage)
    if (title) {
      setMetaTag('twitter:image:alt', title)
    }
    
    // Article meta tags (for blog posts/notes)
    if (type === 'article') {
      if (author) {
        setMetaTag('article:author', author, true)
      }
      if (publishedTime) {
        setMetaTag('article:published_time', publishedTime, true)
      }
      if (modifiedTime) {
        setMetaTag('article:modified_time', modifiedTime, true)
      }
    }
    
    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', currentUrl)

    // Add structured data (JSON-LD) for better SEO
    let structuredData = document.querySelector('script[type="application/ld+json"]')
    if (!structuredData) {
      structuredData = document.createElement('script')
      structuredData.setAttribute('type', 'application/ld+json')
      document.head.appendChild(structuredData)
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : 'WebSite',
      name: 'QuranNerds',
      url: baseUrl,
      publisher: {
        '@type': 'Organization',
        name: 'QuranNerds',
        logo: {
          '@type': 'ImageObject',
          url: defaultImage
        }
      }
    }

    if (description) {
      schema.description = description
    }

    if (type === 'article' && title) {
      schema.headline = title
      if (description) {
        schema.description = description
      }
      if (author) {
        schema.author = {
          '@type': 'Person',
          name: author
        }
      }
      if (publishedTime) {
        schema.datePublished = publishedTime
      }
      if (modifiedTime) {
        schema.dateModified = modifiedTime
      }
      if (image) {
        schema.image = image
      }
    } else {
      schema.potentialAction = {
        '@type': 'SearchAction',
        target: `${baseUrl}/notes?search={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }

    structuredData.textContent = JSON.stringify(schema)

    // Cleanup function
    return () => {
      // Reset to default on unmount
      document.title = 'QuranNerds - Study & Share Quranic Knowledge'
    }
  }, [title, description, keywords, image, url, type, author, publishedTime, modifiedTime])

  return null
}

export default SEO
