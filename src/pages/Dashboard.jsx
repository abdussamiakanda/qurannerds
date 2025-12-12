import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getExcerpt, createNoteSlug } from '../utils/textUtils'
import './Dashboard.css'

function Dashboard({ user }) {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    fetchUserPosts()
  }, [user, navigate])

  const fetchUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      fetchUserPosts()
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
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Your Notes</h1>
        <Link to="/create" className="new-post-btn">
          New Note
        </Link>
      </div>

      <div className="dashboard-content">
        {posts.length === 0 ? (
          <div className="dashboard-empty">
            <p className="empty-message">You haven't written any notes yet.</p>
            <Link to="/create" className="create-first-btn">
              Write your first note
            </Link>
          </div>
        ) : (
          <div className="dashboard-posts">
            {posts.map((post) => {
              const noteSlug = createNoteSlug(post.title, post.id)
              return (
              <div key={post.id} className="dashboard-post-card">
                <div className="post-card-main">
                  <Link to={`/note/${noteSlug}`} className="post-card-link">
                    <h2 className="post-card-title">{post.title}</h2>
                    <p className="post-card-excerpt">
                      {getExcerpt(post.content, 200)}
                    </p>
                  </Link>
                  <div className="post-card-meta">
                    <span className="post-date">{formatDate(post.created_at)}</span>
                    {post.updated_at !== post.created_at && (
                      <span className="post-updated">(edited)</span>
                    )}
                  </div>
                </div>
                <div className="post-card-actions">
                  <Link to={`/edit/${noteSlug}`} className="action-btn edit-btn">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="action-btn delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

