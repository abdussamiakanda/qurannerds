import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RichTextEditor from '../components/RichTextEditor'
import './EditPost.css'

function EditPost({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPost()
  }, [id])

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data.author_id !== user?.id) {
        navigate('/')
        return
      }

      setTitle(data.title)
      setContent(data.content)
    } catch (error) {
      console.error('Error fetching note:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      navigate(`/note/${id}`)
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Failed to update note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Sign in required</h2>
        <p>You need to sign in to edit a note.</p>
        <button onClick={() => navigate('/auth')} className="auth-btn">
          Sign In
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="edit-post-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="edit-post-page">
      <div className="edit-post-container">
        <h1 className="edit-post-title">Edit Note</h1>
        <form onSubmit={handleSubmit} className="edit-post-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Note Title"
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
                onClick={() => navigate(`/note/${id}`)}
                className="cancel-btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-btn"
                disabled={saving || !title.trim() || !content.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditPost

