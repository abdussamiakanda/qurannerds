import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import { createSlug } from '../utils/textUtils'
import './CreatePost.css'

function CreateGroup({ user }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [meetingDay, setMeetingDay] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [location, setLocation] = useState('')
  const [maxMembers, setMaxMembers] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    if (!user) {
      setError('You must be signed in to create a group')
      return
    }

    setLoading(true)

    try {
      // Generate slug from name
      const slug = createSlug(name.trim())
      
      const groupData = {
        name: name.trim(),
        slug: slug,
        description: description.trim() || null,
        topic: topic.trim() || null,
        meeting_day: meetingDay.trim() || null,
        meeting_time: meetingTime.trim() || null,
        location: location.trim() || null,
        max_members: maxMembers ? parseInt(maxMembers) : null,
        is_public: isPublic,
        created_by: user.id
      }

      const { data, error: insertError } = await supabase
        .from('study_groups')
        .insert([groupData])
        .select()
        .single()

      if (insertError) throw insertError

      // Navigate to the group detail page using slug
      navigate(`/groups/${data.slug}`)
    } catch (error) {
      console.error('Error creating group:', error)
      setError(error.message || 'Failed to create group. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Sign in required</h2>
        <p>You need to sign in to create a study group.</p>
        <button onClick={() => navigate('/auth')} className="auth-btn">
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="create-post-page">
      <SEO
        title="Create Study Group"
        description="Create a new Quran study group on QuranNerds. Set up group details, meeting schedule, and invite fellow learners to join your study community."
        keywords="create study group, Quran study group, Islamic study group, QuranNerds groups"
        url={typeof window !== 'undefined' ? `${window.location.origin}/groups/create` : ''}
      />
      <div className="create-post-container">
        <h1 className="create-post-title">Create Study Group</h1>
        <form onSubmit={handleSubmit} className="create-post-form">
          {error && (
            <div className="form-error" style={{ marginBottom: '20px', padding: '12px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '8px', color: 'rgba(220, 38, 38, 0.9)' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <input
              type="text"
              id="name"
              placeholder="Group Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="title-input"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <textarea
              id="description"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="content-textarea"
              rows={3}
              maxLength={1000}
              style={{ minHeight: '120px' }}
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              id="topic"
              placeholder="Topic/Focus (e.g., Tafsir, Memorization, Arabic Language)"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="form-input"
              maxLength={100}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                id="meetingDay"
                placeholder="Meeting Day (e.g., Every Saturday)"
                value={meetingDay}
                onChange={(e) => setMeetingDay(e.target.value)}
                className="form-input"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                id="meetingTime"
                placeholder="Meeting Time (e.g., 7:00 PM)"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="form-input"
                maxLength={50}
              />
            </div>
          </div>

          <div className="form-group">
            <input
              type="text"
              id="location"
              placeholder="Location (e.g., Online, Local Mosque, City Name)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <input
              type="number"
              id="maxMembers"
              placeholder="Max Members (optional - leave empty for unlimited)"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              className="form-input"
              min="1"
            />
          </div>

          <div className="form-group" style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '16px', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
              />
              <span>Public group (anyone can join)</span>
            </label>
          </div>

          <div className="form-actions">
            <div className="form-actions-inner">
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-btn"
                disabled={loading || !name.trim()}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateGroup
