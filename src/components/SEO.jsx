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

    // Basic meta tags
    const metaDescription = description || 'A platform dedicated to sharing knowledge, insights, and reflections on the Quran. Join our community of learners and scholars.'
    const metaKeywords = keywords || 'Quran, Islamic studies, Quranic knowledge, Muslim community, Islamic education, Quran study, Tafsir, Hadith'
    
    setMetaTag('description', metaDescription)
    setMetaTag('keywords', metaKeywords)
    if (author) {
      setMetaTag('author', author)
    }
    
    // Open Graph tags
    setMetaTag('og:title', fullTitle, true)
    setMetaTag('og:description', metaDescription, true)
    setMetaTag('og:type', type, true)
    setMetaTag('og:url', currentUrl, true)
    setMetaTag('og:image', image || defaultImage, true)
    setMetaTag('og:site_name', 'QuranNerds', true)
    setMetaTag('og:locale', 'en_US', true)
    
    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image')
    setMetaTag('twitter:title', fullTitle)
    setMetaTag('twitter:description', metaDescription)
    setMetaTag('twitter:image', image || defaultImage)
    
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
      description: metaDescription,
      publisher: {
        '@type': 'Organization',
        name: 'QuranNerds',
        logo: {
          '@type': 'ImageObject',
          url: defaultImage
        }
      }
    }

    if (type === 'article' && title) {
      schema.headline = title
      schema.description = metaDescription
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
