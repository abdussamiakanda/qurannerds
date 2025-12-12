import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, Eye, MessageCircle, Home, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Comments from '../components/Comments'
import LogoIcon from '../components/LogoIcon'
import SEO from '../components/SEO'
import { awardPoints } from '../utils/gamification'
import { processQuranicContent, extractIdFromSlug, createProfileSlug, getAudioUrl, parseVerseReference, getExcerpt } from '../utils/textUtils'
import './Note.css'

function Note({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState(null)
  const [authorProfile, setAuthorProfile] = useState(null)
  const [likesCount, setLikesCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [viewsCount, setViewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState(false)
  const audioRef = useRef(null)
  const currentPlayingBtn = useRef(null)

  useEffect(() => {
    fetchNote()
  }, [slug])

  useEffect(() => {
    if (note) {
      incrementViews()
    }
  }, [note])

  useEffect(() => {
    if (note && user) {
      checkIfLiked()
    }
  }, [note, user])


  useEffect(() => {
    if (!note) return

    // Audio click handler
    const handleAudioClick = async (e) => {
      const btn = e.currentTarget || e.target.closest('.verse-audio-btn')
      
      if (!btn) return
      
      const surah = parseInt(btn.dataset.surah)
      const startAyah = parseInt(btn.dataset.startAyah)
      const endAyah = parseInt(btn.dataset.endAyah)

      if (!surah || !startAyah) return

      // If clicking the same button, toggle play/pause
      if (currentPlayingBtn.current === btn && audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play()
          btn.querySelector('.play-icon').style.display = 'none'
          btn.querySelector('.pause-icon').style.display = 'block'
        } else {
          audioRef.current.pause()
          btn.querySelector('.play-icon').style.display = 'block'
          btn.querySelector('.pause-icon').style.display = 'none'
        }
        return
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (currentPlayingBtn.current) {
        currentPlayingBtn.current.querySelector('.play-icon').style.display = 'block'
        currentPlayingBtn.current.querySelector('.pause-icon').style.display = 'none'
      }

      // Create new audio element
      const audio = new Audio()
      audioRef.current = audio
      currentPlayingBtn.current = btn

      // Update button state
      btn.querySelector('.play-icon').style.display = 'none'
      btn.querySelector('.pause-icon').style.display = 'block'

      try {
        // For range, play from start to end (e.g., "Al-Faatiha 1-5")
        if (endAyah > startAyah) {
          // Play multiple ayahs sequentially
          let currentAyah = startAyah
          const playNextAyah = async () => {
            if (currentAyah > endAyah) {
              // Finished playing all ayahs
              btn.querySelector('.play-icon').style.display = 'block'
              btn.querySelector('.pause-icon').style.display = 'none'
              audioRef.current = null
              currentPlayingBtn.current = null
              return
            }

            const audioApiUrl = getAudioUrl(surah, currentAyah)
            try {
              const response = await fetch(audioApiUrl)
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
              }
              const data = await response.json()
              
              // Al-Quran Cloud API returns: { code: 200, data: { audio: "url", audioSecondary: ["url1", "url2"] } }
              const audioFileUrl = data?.data?.audio || 
                                   data?.data?.audioSecondary?.[0]
              
              if (audioFileUrl) {
                audio.src = audioFileUrl
                audio.onended = () => {
                  currentAyah++
                  playNextAyah()
                }
                audio.onerror = () => {
                  currentAyah++
                  playNextAyah()
                }
                await audio.play()
              } else {
                currentAyah++
                playNextAyah()
              }
            } catch (fetchError) {
              currentAyah++
              playNextAyah()
            }
          }
          playNextAyah()
        } else {
          // Single ayah
          const audioApiUrl = getAudioUrl(surah, startAyah)
          const response = await fetch(audioApiUrl)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          
          // Al-Quran Cloud API returns: { code: 200, data: { audio: "url", audioSecondary: ["url1", "url2"] } }
          const audioFileUrl = data?.data?.audio || 
                               data?.data?.audioSecondary?.[0]
          
          if (audioFileUrl) {
            audio.src = audioFileUrl
            audio.onended = () => {
              btn.querySelector('.play-icon').style.display = 'block'
              btn.querySelector('.pause-icon').style.display = 'none'
              audioRef.current = null
              currentPlayingBtn.current = null
            }
            audio.onerror = () => {
              btn.querySelector('.play-icon').style.display = 'block'
              btn.querySelector('.pause-icon').style.display = 'none'
              audioRef.current = null
              currentPlayingBtn.current = null
            }
            await audio.play()
          } else {
            btn.querySelector('.play-icon').style.display = 'block'
            btn.querySelector('.pause-icon').style.display = 'none'
            audioRef.current = null
            currentPlayingBtn.current = null
          }
        }
      } catch (error) {
        btn.querySelector('.play-icon').style.display = 'block'
        btn.querySelector('.pause-icon').style.display = 'none'
        audioRef.current = null
        currentPlayingBtn.current = null
      }
    }

    // Parse verse references and add audio buttons dynamically
    const addAudioButtons = async () => {
      const postContent = document.querySelector('.post-content')
      if (!postContent) {
        setTimeout(addAudioButtons, 200)
        return
      }
      
      const verseHeaders = document.querySelectorAll('.post-content .verse-header[data-verse-reference]')
      
      for (const header of verseHeaders) {
        // Skip if button already exists
        if (header.querySelector('.verse-audio-btn')) {
          continue
        }
        
        const reference = header.getAttribute('data-verse-reference')
        if (!reference) continue
        
        try {
          const verseData = await parseVerseReference(reference)
          if (verseData) {
            const audioBtn = document.createElement('button')
            audioBtn.className = 'verse-audio-btn'
            audioBtn.setAttribute('data-surah', verseData.surah)
            audioBtn.setAttribute('data-start-ayah', verseData.startAyah)
            audioBtn.setAttribute('data-end-ayah', verseData.endAyah)
            audioBtn.setAttribute('aria-label', 'Play audio')
            audioBtn.innerHTML = `
              <svg class="audio-icon play-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events: none;">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <svg class="audio-icon pause-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none; pointer-events: none;">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            `
            
            header.appendChild(audioBtn)
            
            // Add click handler with event propagation prevention
            const clickHandler = (e) => {
              e.preventDefault()
              e.stopPropagation()
              e.stopImmediatePropagation()
              handleAudioClick(e)
            }
            
            audioBtn.addEventListener('click', clickHandler, true)
          }
        } catch (error) {
          // Silently fail - button won't be added if parsing fails
        }
      }
    }
    
    // Wait for DOM to be ready, then add buttons
    // Use multiple strategies to ensure buttons are added
    let checkInterval = null
    let observer = null
    let timeouts = []
    
    const checkAndAddButtons = () => {
      const verseHeaders = document.querySelectorAll('.post-content .verse-header[data-verse-reference]')
      const headersWithoutButtons = Array.from(verseHeaders).filter(header => !header.querySelector('.verse-audio-btn'))
      
      if (headersWithoutButtons.length > 0) {
        addAudioButtons()
      }
    }
    
    const postContentContainer = document.querySelector('.post-content')
    
    if (postContentContainer) {
      // Strategy 1: MutationObserver to watch for content changes
      observer = new MutationObserver(() => {
        checkAndAddButtons()
      })
      
      observer.observe(postContentContainer, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      })
      
      // Strategy 2: Periodic checks as fallback
      checkInterval = setInterval(() => {
        checkAndAddButtons()
      }, 500)
      
      // Strategy 3: Immediate and delayed checks
      timeouts.push(setTimeout(checkAndAddButtons, 50))
      timeouts.push(setTimeout(checkAndAddButtons, 200))
      timeouts.push(setTimeout(checkAndAddButtons, 500))
      timeouts.push(setTimeout(checkAndAddButtons, 1000))
      timeouts.push(setTimeout(checkAndAddButtons, 2000))
      
      return () => {
        if (observer) observer.disconnect()
        if (checkInterval) clearInterval(checkInterval)
        timeouts.forEach(timeout => clearTimeout(timeout))
        const audioButtons = document.querySelectorAll('.verse-audio-btn')
        audioButtons.forEach(btn => {
          btn.removeEventListener('click', handleAudioClick)
        })
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
      }
    } else {
      // If container doesn't exist yet, retry with exponential backoff
      let attempts = 0
      const maxAttempts = 10
      
      const retryCheck = () => {
        attempts++
        const container = document.querySelector('.post-content')
        if (container) {
          // Container found, set up observers
          const verseHeaders = document.querySelectorAll('.post-content .verse-header[data-verse-reference]')
          if (verseHeaders.length > 0) {
            addAudioButtons()
          }
        } else if (attempts < maxAttempts) {
          timeouts.push(setTimeout(retryCheck, 200 * attempts))
        }
      }
      
      timeouts.push(setTimeout(retryCheck, 100))
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout))
        const audioButtons = document.querySelectorAll('.verse-audio-btn')
        audioButtons.forEach(btn => {
          btn.removeEventListener('click', handleAudioClick)
        })
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current = null
        }
      }
    }
  }, [note])

  const fetchNote = async () => {
    try {
      // Extract last 4 digits from slug
      const idSuffix = extractIdFromSlug(slug)
      if (!idSuffix) {
        setLoading(false)
        return
      }

      // Fetch all posts and filter by matching slug and ID suffix
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Find note where ID ends with the suffix and slug matches
      const foundNote = data?.find(post => {
        const postIdSuffix = post.id.slice(-4)
        return postIdSuffix === idSuffix
      })

      if (!foundNote) {
        setLoading(false)
        return
      }

      setNote(foundNote)
      setViewsCount(foundNote.views || 0)

      // Fetch author profile
      if (foundNote?.author_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, name')
          .eq('id', foundNote.author_id)
          .single()

        if (profile) {
          setAuthorProfile(profile)
        }
      }

      // Fetch likes count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', foundNote.id)

      setLikesCount(count || 0)
    } catch (error) {
      console.error('Error fetching note:', error)
    } finally {
      setLoading(false)
    }
  }

  const incrementViews = async () => {
    if (!note) return
    
    // Check if this post has already been viewed by this user (using localStorage)
    // This prevents counting multiple views from the same user on refresh
    const viewKey = `post_viewed_${note.id}`
    const hasViewed = localStorage.getItem(viewKey)
    
    // If already viewed in this session/browser, don't increment again
    if (hasViewed) {
      return
    }
    
    // Mark as viewed in localStorage (expires after 24 hours)
    const viewData = {
      postId: note.id,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }
    localStorage.setItem(viewKey, JSON.stringify(viewData))
    
    // Clean up expired view records (optional cleanup)
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('post_viewed_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key))
            if (data.expiresAt && Date.now() > data.expiresAt) {
              localStorage.removeItem(key)
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key)
          }
        }
      })
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    try {
      await supabase.rpc('increment_post_views', { post_uuid: note.id })
      // Refresh views count
      const { data } = await supabase
        .from('posts')
        .select('views')
        .eq('id', note.id)
        .single()
      
      if (data) {
        setViewsCount(data.views || 0)
      }
    } catch (error) {
      console.error('Error incrementing views:', error)
    }

    // Award points for reading a post (only once per user per post)
    if (user && note && note.id) {
      try {
        // Check if user already read this post today to avoid duplicate points
        const today = new Date().toISOString().split('T')[0]
        const { data: existingActivity } = await supabase
          .from('daily_activities')
          .select('posts_read')
          .eq('user_id', user.id)
          .eq('activity_date', today)
          .maybeSingle()

        // Only award points if user hasn't read many posts today (to prevent abuse)
        if (!existingActivity || (existingActivity.posts_read || 0) < 10) {
          await awardPoints(user.id, 1, 'post_read', note.id, 'Read a post')
        }
      } catch (pointsError) {
        // Silently fail - don't block view incrementing if points fail
        console.error('Error awarding points for reading:', pointsError)
      }
    }
  }

  const checkIfLiked = async () => {
    if (!user || !note) return

    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', note.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking like status:', error)
        setIsLiked(false)
        return
      }

      setIsLiked(!!data)
    } catch (error) {
      // Not liked or error - that's okay
      console.error('Error checking like status:', error)
      setIsLiked(false)
    }
  }

  const handleLike = async () => {
    if (!user) {
      alert('Please sign in to like notes')
      return
    }

    setLiking(true)
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', note.id)
          .eq('user_id', user.id)

        if (error) throw error
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert([
            {
              post_id: note.id,
              user_id: user.id
            }
          ])

        if (error) throw error
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      alert('Failed to update like')
    } finally {
      setLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', note.id)

      if (error) throw error
      navigate('/notes')
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="post-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="post-not-found">
        <div className="post-not-found-container">
          <div className="post-not-found-content">
            <div className="post-not-found-icon-wrapper">
              <LogoIcon size={64} className="post-not-found-icon" />
            </div>
            
            <h2 className="post-not-found-title">Note Not Found</h2>
            
            <p className="post-not-found-text">
              The note you're looking for doesn't exist or has been removed. 
              Let's get you back on track.
            </p>
            
            <div className="post-not-found-actions">
              <Link to="/" className="post-not-found-button primary">
                <Home size={20} />
                <span>Go Home</span>
              </Link>
              
              <Link to="/notes" className="post-not-found-button secondary">
                <BookOpen size={20} />
                <span>Browse Notes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isAuthor = user && user.id === note.author_id

  // Get excerpt for SEO description
  const noteExcerpt = note ? getExcerpt(note.content, 160) : ''
  const noteUrl = note && typeof window !== 'undefined' ? `${window.location.origin}/note/${slug}` : (typeof window !== 'undefined' ? window.location.href : '')

  return (
    <div className="post-page">
      {note && (
        <SEO
          title={note.title}
          description={noteExcerpt || `Read "${note.title}" by ${authorProfile?.name || note.author_name || 'Anonymous'} on QuranNerds. Join our community of learners sharing Quranic insights and reflections.`}
          keywords={`Quran, ${note.title}, Islamic studies, Quranic knowledge, ${authorProfile?.name || note.author_name || ''}`}
          type="article"
          url={noteUrl}
          author={authorProfile?.name || note.author_name || 'Anonymous'}
          publishedTime={note.created_at}
          modifiedTime={note.updated_at}
        />
      )}
      <article className="post-article">
        <div className="post-header">
          <h1 className="post-title">{note.title}</h1>
          <div className="post-meta">
            <Link 
              to={`/profile/${createProfileSlug(authorProfile?.name || note.author_name || note.author_email || 'user')}`} 
              className="post-author-info"
            >
              {authorProfile?.avatar_url && authorProfile.avatar_url.trim() ? (
                <img 
                  src={authorProfile.avatar_url} 
                  alt={authorProfile.name || note.author_name}
                  className="post-author-avatar-img"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="post-author-avatar"
                style={{ display: authorProfile?.avatar_url && authorProfile.avatar_url.trim() ? 'none' : 'flex' }}
              >
                {(authorProfile?.name || note.author_name || note.author_email || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="post-author-name">
                  {authorProfile?.name || note.author_name || note.author_email || 'Anonymous'}
                </div>
                <div className="post-meta-date">{formatDate(note.created_at)}</div>
              </div>
            </Link>
            {isAuthor && (
              <div className="post-actions">
                <Link to={`/edit/${slug}`} className="edit-btn">
                  Edit
                </Link>
                <button onClick={handleDelete} className="delete-btn">
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div 
          className="post-content"
          dangerouslySetInnerHTML={{ __html: processQuranicContent(note.content) }}
        />

        <div className="post-engagement">
          <button
            onClick={handleLike}
            className={`engagement-btn like-btn ${isLiked ? 'liked' : ''}`}
            disabled={liking || !user}
            title={user ? (isLiked ? 'Unlike' : 'Like') : 'Sign in to like'}
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            <span>{likesCount}</span>
          </button>

          <div className="engagement-btn views-btn" title="Views">
            <Eye size={20} />
            <span>{viewsCount}</span>
          </div>
        </div>
      </article>

      <Comments 
        postId={note.id} 
        user={user} 
        noteSlug={slug}
        noteTitle={note.title}
      />
    </div>
  )
}

export default Note

