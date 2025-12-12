import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import { createNoteSlug } from '../utils/textUtils'
import { awardPoints } from '../utils/gamification'
import RichTextEditor from '../components/RichTextEditor'
import './CreatePost.css'

function CreatePost({ user }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [titleError, setTitleError] = useState('')

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Sign in required</h2>
        <p>You need to sign in to create a note.</p>
        <button onClick={() => navigate('/auth')} className="auth-btn">
          Sign In
        </button>
      </div>
    )
  }

  const checkTitleUnique = async (titleToCheck) => {
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('title', titleToCheck.trim())
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

    // Check if title is unique
    const isUnique = await checkTitleUnique(title.trim())
    if (!isUnique) {
      setTitleError('A note with this title already exists. Please choose a different title.')
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

      // Award points for creating a post
      await awardPoints(user.id, 10, 'post_created', data.id, 'Created a new post')

      const noteSlug = createNoteSlug(data.title, data.id)
      
      // Send email notification to all users (fire and forget)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        
        fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            type: 'note',
            noteId: data.id,
            noteTitle: data.title,
            noteAuthorName: data.author_name || user.user_metadata?.name || user.email?.split('@')[0],
            noteSlug: noteSlug,
          }),
        }).catch(err => {
          console.error('Error sending email notification:', err)
          // Don't block navigation if email fails
        })
      } catch (emailError) {
        console.error('Error sending email notification:', emailError)
        // Don't block navigation if email fails
      }
      
      navigate(`/note/${noteSlug}`)
    } catch (error) {
      console.error('Error creating note:', error)
      alert('Failed to create note. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-post-page">
      <SEO
        title="Create Note"
        description="Create and share your Quranic study notes, reflections, and insights on QuranNerds. Join our community of learners sharing knowledge about the Quran."
        keywords="create Quran note, write Islamic study, share Quran insights, QuranNerds"
        url={typeof window !== 'undefined' ? `${window.location.origin}/create` : ''}
      />
      <div className="create-post-container">
        <h1 className="create-post-title">Create New Note</h1>
        <form onSubmit={handleSubmit} className="create-post-form">
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

