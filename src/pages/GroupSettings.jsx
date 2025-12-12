import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import { createSlug } from '../utils/textUtils'
import './CreatePost.css'

function GroupSettings({ user }) {
  const { groupSlug } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [meetingDay, setMeetingDay] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [location, setLocation] = useState('')
  const [maxMembers, setMaxMembers] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [group, setGroup] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    if (groupSlug) {
      fetchGroup()
    }
  }, [groupSlug, user, navigate])

  const fetchGroup = async () => {
    try {
      const { data, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('slug', groupSlug)
        .single()

      if (groupError) throw groupError

      setGroup(data)
      setName(data.name || '')
      setDescription(data.description || '')
      setTopic(data.topic || '')
      setMeetingDay(data.meeting_day || '')
      setMeetingTime(data.meeting_time || '')
      setLocation(data.location || '')
      setMaxMembers(data.max_members ? data.max_members.toString() : '')
      setIsPublic(data.is_public !== false)

      // Check user role
      if (user && data) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', data.id)
          .eq('user_id', user.id)
          .single()

        if (memberData) {
          setUserRole(memberData.role)
        } else if (data.created_by === user.id) {
          setUserRole('admin')
        }
      }
    } catch (error) {
      console.error('Error fetching group:', error)
      setError('Failed to load group. You may not have permission to edit it.')
      navigate('/groups')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    if (!user || !group) {
      setError('You must be signed in to edit a group')
      return
    }

    // Check permissions
    const isCreator = group.created_by === user.id
    const canEdit = isCreator || userRole === 'admin' || userRole === 'moderator'

    if (!canEdit) {
      setError('You do not have permission to edit this group')
      return
    }

    setSaving(true)

    try {
      // Generate new slug if name changed
      const newSlug = name.trim() !== group.name ? createSlug(name.trim()) : group.slug

      const groupData = {
        name: name.trim(),
        slug: newSlug,
        description: description.trim() || null,
        topic: topic.trim() || null,
        meeting_day: meetingDay.trim() || null,
        meeting_time: meetingTime.trim() || null,
        location: location.trim() || null,
        max_members: maxMembers ? parseInt(maxMembers) : null,
        is_public: isPublic
      }

      const { error: updateError } = await supabase
        .from('study_groups')
        .update(groupData)
        .eq('id', group.id)

      if (updateError) throw updateError

      setMessage('Group updated successfully!')
      setTimeout(() => {
        // Navigate to new slug if it changed
        if (newSlug !== groupSlug) {
          navigate(`/groups/${newSlug}`)
        } else {
          navigate(`/groups/${groupSlug}`)
        }
      }, 1500)
    } catch (error) {
      console.error('Error updating group:', error)
      setError(error.message || 'Failed to update group. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="create-post-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Group not found</h2>
          <p>The group you're looking for doesn't exist or you don't have permission to edit it.</p>
          <button onClick={() => navigate('/groups')} className="auth-btn">
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  const isCreator = group.created_by === user.id
  const canEdit = isCreator || userRole === 'admin' || userRole === 'moderator'

  if (!canEdit) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Permission Denied</h2>
          <p>You do not have permission to edit this group. Only group creators and admins can edit group settings.</p>
          <button onClick={() => navigate(`/groups/${groupSlug}`)} className="auth-btn">
            Back to Group
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="create-post-page">
      <SEO
        title={`Edit ${group.name} - Group Settings`}
        description={`Edit settings for ${group.name} on QuranNerds. Update group details, meeting schedule, and preferences.`}
        keywords={`edit group, group settings, ${group.name}, QuranNerds groups`}
        url={typeof window !== 'undefined' ? `${window.location.origin}/groups/${groupSlug}/settings` : ''}
      />
      <div className="create-post-container">
        <h1 className="create-post-title">Edit Group Settings</h1>
        <form onSubmit={handleSubmit} className="create-post-form">
          {(error || message) && (
            <div
              className="form-error"
              style={{
                marginBottom: '20px',
                padding: '12px',
                background: message ? 'rgba(74, 222, 128, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                borderRadius: '8px',
                color: message ? 'rgba(74, 222, 128, 0.9)' : 'rgba(220, 38, 38, 0.9)'
              }}
            >
              {error || message}
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
                onClick={() => navigate(`/groups/${groupSlug}`)}
                className="cancel-btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-btn"
                disabled={saving || !name.trim()}
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

export default GroupSettings
