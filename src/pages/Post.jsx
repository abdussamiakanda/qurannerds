import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Heart, Eye, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Comments from '../components/Comments'
import { processQuranicContent } from '../utils/textUtils'
import './Post.css'

function Post({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [authorProfile, setAuthorProfile] = useState(null)
  const [likesCount, setLikesCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [viewsCount, setViewsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    fetchPost()
    incrementViews()
  }, [id])

  useEffect(() => {
    if (post && user) {
      checkIfLiked()
    }
  }, [post, user])

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setPost(data)
      setViewsCount(data.views || 0)

      // Fetch author profile
      if (data?.author_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, name')
          .eq('id', data.author_id)
          .single()

        if (profile) {
          setAuthorProfile(profile)
        }
      }

      // Fetch likes count
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id)

      setLikesCount(count || 0)
    } catch (error) {
      console.error('Error fetching post:', error)
    } finally {
      setLoading(false)
    }
  }

  const incrementViews = async () => {
    try {
      await supabase.rpc('increment_post_views', { post_uuid: id })
      // Refresh views count
      const { data } = await supabase
        .from('posts')
        .select('views')
        .eq('id', id)
        .single()
      
      if (data) {
        setViewsCount(data.views || 0)
      }
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  const checkIfLiked = async () => {
    if (!user || !post) return

    try {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
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
      alert('Please sign in to like posts')
      return
    }

    setLiking(true)
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
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
              post_id: post.id,
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
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/')
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
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

  if (!post) {
    return (
      <div className="post-not-found">
        <h2>Post not found</h2>
        <Link to="/">Go back home</Link>
      </div>
    )
  }

  const isAuthor = user && user.id === post.author_id

  return (
    <div className="post-page">
      <article className="post-article">
        <div className="post-header">
          <h1 className="post-title">{post.title}</h1>
          <div className="post-meta">
            <Link 
              to={`/profile/${post.author_id}`} 
              className="post-author-info"
            >
              {authorProfile?.avatar_url && authorProfile.avatar_url.trim() ? (
                <img 
                  src={authorProfile.avatar_url} 
                  alt={authorProfile.name || post.author_name}
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
                {(authorProfile?.name || post.author_name || post.author_email || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="post-author-name">
                  {authorProfile?.name || post.author_name || post.author_email || 'Anonymous'}
                </div>
                <div className="post-meta-date">{formatDate(post.created_at)}</div>
              </div>
            </Link>
            {isAuthor && (
              <div className="post-actions">
                <Link to={`/edit/${post.id}`} className="edit-btn">
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
          dangerouslySetInnerHTML={{ __html: processQuranicContent(post.content) }}
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

      <Comments postId={post.id} user={user} />
    </div>
  )
}

export default Post

