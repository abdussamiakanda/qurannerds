import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Eye, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getExcerpt } from '../utils/textUtils'
import './Home.css'

function Home({ user }) {
  const [posts, setPosts] = useState([])
  const [authorProfiles, setAuthorProfiles] = useState({})
  const [postsStats, setPostsStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])

      // Fetch profiles for all unique authors
      if (data && data.length > 0) {
        const postIds = data.map(post => post.id)
        const authorIds = [...new Set(data.map(post => post.author_id).filter(Boolean))]
        
        if (authorIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, avatar_url, name')
            .in('id', authorIds)

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          }

          if (profiles) {
            const profilesMap = {}
            profiles.forEach(profile => {
              profilesMap[profile.id] = profile
            })
            setAuthorProfiles(profilesMap)
          }
        }

        // Fetch likes and comments counts for all posts
        if (postIds.length > 0) {
          const [likesData, commentsData] = await Promise.all([
            supabase
              .from('post_likes')
              .select('post_id')
              .in('post_id', postIds),
            supabase
              .from('comments')
              .select('post_id')
              .in('post_id', postIds)
          ])

          const statsMap = {}
          postIds.forEach(postId => {
            statsMap[postId] = {
              likes: 0,
              comments: 0,
              views: data.find(p => p.id === postId)?.views || 0
            }
          })

          if (likesData.data) {
            likesData.data.forEach(like => {
              if (statsMap[like.post_id]) {
                statsMap[like.post_id].likes++
              }
            })
          }

          if (commentsData.data) {
            commentsData.data.forEach(comment => {
              if (statsMap[comment.post_id]) {
                statsMap[comment.post_id].comments++
              }
            })
          }

          setPostsStats(statsMap)
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
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
      <div className="home-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="home-header">
        <h1 className="home-title">Quran Study Posts</h1>
        <p className="home-subtitle">
          Share your reflections, insights, and learnings from the Quran
        </p>
      </div>

      <div className="posts-container">
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No posts yet. Be the first to share your Quran study insights!</p>
            {user && (
              <Link to="/create" className="create-first-post-btn">
                Create Your First Post
              </Link>
            )}
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => {
              const authorProfile = authorProfiles[post.author_id]
              const authorAvatar = authorProfile?.avatar_url
              const authorName = authorProfile?.name || post.author_name || post.author_email || 'Anonymous'
              const authorInitial = authorName.charAt(0).toUpperCase()
              const stats = postsStats[post.id] || { likes: 0, comments: 0, views: 0 }

              return (
                <Link key={post.id} to={`/post/${post.id}`} className="post-card">
                  <div className="post-card-header">
                    <div className="post-author">
                      {authorAvatar && authorAvatar.trim() ? (
                        <img 
                          src={authorAvatar} 
                          alt={authorName} 
                          className="author-avatar-img"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className="author-avatar"
                        style={{ display: authorAvatar && authorAvatar.trim() ? 'none' : 'flex' }}
                      >
                        {authorInitial}
                      </div>
                      <div className="author-info">
                        <div className="author-name">
                          {authorName}
                        </div>
                        <div className="post-date">{formatDate(post.created_at)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="post-card-content">
                    <h2 className="post-card-title">{post.title}</h2>
                    <p className="post-card-excerpt">{getExcerpt(post.content, 150)}</p>
                    <div className="post-card-footer">
                      <div className="post-card-stats">
                        <div className="post-stat-item">
                          <Heart size={16} />
                          <span>{stats.likes}</span>
                        </div>
                        <div className="post-stat-item">
                          <MessageCircle size={16} />
                          <span>{stats.comments}</span>
                        </div>
                        <div className="post-stat-item">
                          <Eye size={16} />
                          <span>{stats.views}</span>
                        </div>
                      </div>
                      <span className="read-more">Read more</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Home

