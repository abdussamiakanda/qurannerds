import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, Eye, MessageCircle, Home, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Comments from '../components/Comments'
import LogoIcon from '../components/LogoIcon'
import { processQuranicContent, extractIdFromSlug, createProfileSlug } from '../utils/textUtils'
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
  }

  const checkIfLiked = async () => {
    if (!user || !note) return

    try {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', note.id)
        .eq('user_id', user.id)
        .single()

      setIsLiked(!!data)
    } catch (error) {
      // Not liked or error - that's okay
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

  return (
    <div className="post-page">
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

      <Comments postId={note.id} user={user} />
    </div>
  )
}

export default Note

