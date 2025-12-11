import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Globe, Twitter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getExcerpt } from '../utils/textUtils'
import './Profile.css'

function Profile({ user }) {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const fetchProfile = async () => {
    try {
      const targetUserId = userId || user?.id
      if (!targetUserId) {
        setLoading(false)
        return
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError)
      }

      // Fetch user email if profile exists or if viewing own profile
      let userEmail = null
      if (targetUserId === user?.id) {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        userEmail = currentUser?.email
      }

      // If no profile, create a basic one from user metadata
      if (!profileData) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser && targetUserId === authUser.id) {
          setProfile({
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            bio: '',
            avatar_url: '',
            location: '',
            website: '',
            twitter_url: '',
            email: authUser.email
          })
        } else {
          setProfile({
            id: targetUserId,
            name: 'User',
            bio: '',
            avatar_url: '',
            location: '',
            website: '',
            twitter_url: ''
          })
        }
      } else {
        setProfile({
          ...profileData,
          email: userEmail || profileData.email
        })
      }

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Error fetching posts:', postsError)
      } else {
        setPosts(postsData || [])
      }
    } catch (error) {
      console.error('Error loading profile:', error)
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
      <div className="profile-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-not-found">
        <h2>Profile not found</h2>
        <Link to="/">Go back home</Link>
      </div>
    )
  }

  const isOwnProfile = user && user.id === profile.id

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-container">
          {profile.avatar_url && profile.avatar_url.trim() ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.name}
              className="profile-avatar"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div 
            className="profile-avatar-fallback"
            style={{ display: profile.avatar_url && profile.avatar_url.trim() ? 'none' : 'flex' }}
          >
            {profile.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{profile.name || 'User'}</h1>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-meta">
            {profile.location && (
              <span className="profile-meta-item">
                <MapPin size={14} />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a 
                href={profile.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-meta-item profile-link"
              >
                <Globe size={14} />
                Website
              </a>
            )}
            {profile.twitter_url && (
              <a 
                href={profile.twitter_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-meta-item profile-link"
              >
                <Twitter size={14} />
                Twitter
              </a>
            )}
          </div>
          {isOwnProfile && (
            <Link to="/settings" className="edit-profile-btn">
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-posts-section">
          <h2 className="profile-section-title">
            Posts ({posts.length})
          </h2>
          {posts.length === 0 ? (
            <div className="profile-empty-posts">
              <p>No notes yet.</p>
              {isOwnProfile && (
                <Link to="/dashboard" className="create-post-link">
                  Create your first note
                </Link>
              )}
            </div>
          ) : (
            <div className="profile-posts-grid">
              {posts.map((post) => (
                <Link key={post.id} to={`/note/${post.id}`} className="profile-post-card">
                  <h3 className="profile-post-title">{post.title}</h3>
                  <p className="profile-post-excerpt">
                    {getExcerpt(post.content, 150)}
                  </p>
                  <div className="profile-post-date">
                    {formatDate(post.created_at)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile

