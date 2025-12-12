import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import { extractIdFromSlug, createNoteSlug } from '../utils/textUtils'
import RichTextEditor from '../components/RichTextEditor'
import './EditPost.css'

function EditPost({ user }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [noteId, setNoteId] = useState(null)
  const [originalTitle, setOriginalTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [titleError, setTitleError] = useState('')

  useEffect(() => {
    fetchPost()
  }, [slug])

  const fetchPost = async () => {
    try {
      // Extract last 4 digits from slug
      const idSuffix = extractIdFromSlug(slug)
      if (!idSuffix) {
        setLoading(false)
        return
      }

      // Fetch all posts and find matching one
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Find note where ID ends with the suffix
      const foundNote = data?.find(post => {
        const postIdSuffix = post.id.slice(-4)
        return postIdSuffix === idSuffix
      })

      if (!foundNote) {
        setLoading(false)
        return
      }

      const id = foundNote.id
      setNoteId(id)

      if (error) throw error

      if (foundNote.author_id !== user?.id) {
        navigate('/')
        return
      }

      setTitle(foundNote.title)
      setOriginalTitle(foundNote.title)
      setContent(foundNote.content)
    } catch (error) {
      console.error('Error fetching note:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const checkTitleUnique = async (titleToCheck, excludeId) => {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('title', titleToCheck.trim())
      .neq('id', excludeId)
      .maybeSingle()

    if (error) {
      console.error('Error checking title:', error)
      return true // Allow if check fails
    }

    return !data // Return true if no note with this title exists
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTitleError('')
    
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content')
      return
    }

    // Only check uniqueness if title has changed
    if (title.trim() !== originalTitle.trim()) {
      const isUnique = await checkTitleUnique(title.trim(), noteId)
      if (!isUnique) {
        setTitleError('A note with this title already exists. Please choose a different title.')
        return
      }
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
        .eq('id', noteId)

      if (error) throw error

      const noteSlug = createNoteSlug(title.trim(), noteId)
      navigate(`/note/${noteSlug}`)
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
      <SEO
        title={title ? `Edit: ${title}` : "Edit Note"}
        description="Edit your Quranic study note on QuranNerds. Update your reflections and insights on the Quran."
        keywords="edit Quran note, update Islamic study, QuranNerds edit"
        url={typeof window !== 'undefined' ? (title ? `${window.location.origin}/edit/${slug}` : `${window.location.origin}/edit`) : ''}
      />
      <div className="edit-post-container">
        <h1 className="edit-post-title">Edit Note</h1>
        <form onSubmit={handleSubmit} className="edit-post-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Note Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleError('')
              }}
              className={`title-input ${titleError ? 'error' : ''}`}
              maxLength={200}
            />
            {titleError && (
              <div className="form-error">{titleError}</div>
            )}
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
                onClick={() => {
                  if (noteId) {
                    const noteSlug = createNoteSlug(title, noteId)
                    navigate(`/note/${noteSlug}`)
                  } else {
                    navigate('/notes')
                  }
                }}
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

