import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RichTextEditor from '../components/RichTextEditor'
import './CreatePost.css'

function CreatePost({ user }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Sign in required</h2>
        <p>You need to sign in to create a post.</p>
        <button onClick={() => navigate('/auth')} className="auth-btn">
          Sign In
        </button>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            author_id: user.id,
            author_email: user.email,
            author_name: user.user_metadata?.name || user.email?.split('@')[0]
          }
        ])
        .select()
        .single()

      if (error) throw error

      navigate(`/post/${data.id}`)
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-post-page">
      <div className="create-post-container">
        <h1 className="create-post-title">Create New Post</h1>
        <form onSubmit={handleSubmit} className="create-post-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Post Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
              maxLength={200}
            />
          </div>
          
          <div className="form-group">
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your Quran study reflections, insights, and learnings here..."
            />
          </div>

          <div className="form-actions">
            <div className="form-actions-inner">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="publish-btn"
                disabled={loading || !title.trim() || !content.trim()}
              >
                {loading ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePost

