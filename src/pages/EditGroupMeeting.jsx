import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import './CreatePost.css'

function EditGroupMeeting({ user }) {
  const { groupSlug, meetingId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingType, setMeetingType] = useState('online')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [location, setLocation] = useState('')
  const [onlineLink, setOnlineLink] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [group, setGroup] = useState(null)
  const [meeting, setMeeting] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    if (groupSlug && meetingId) {
      fetchGroup()
      fetchMeeting()
    }
  }, [groupSlug, meetingId, user, navigate])

  const fetchGroup = async () => {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('slug', groupSlug)
        .single()

      if (groupError) throw groupError

      setGroup(groupData)

      // Check if user is a member
      if (user && groupData) {
        const { data: memberData } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupData.id)
          .eq('user_id', user.id)
          .single()

        setIsMember(!!memberData)
      }
    } catch (error) {
      console.error('Error fetching group:', error)
      setError('Failed to load group.')
      navigate('/groups')
    }
  }

  const fetchMeeting = async () => {
    try {
      const { data: meetingData, error: meetingError } = await supabase
        .from('group_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      if (meetingError) throw meetingError

      setMeeting(meetingData)

      // Check if user can edit (creator or group admin)
      if (user && meetingData) {
        const isCreator = meetingData.created_by === user.id
        const isGroupCreator = group && group.created_by === user.id
        
        // Check if user is admin
        let isAdmin = false
        if (group) {
          const { data: memberData } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', group.id)
            .eq('user_id', user.id)
            .single()
          
          isAdmin = memberData?.role === 'admin'
        }

        setCanEdit(isCreator || isGroupCreator || isAdmin)

        // Populate form
        setTitle(meetingData.title || '')
        setDescription(meetingData.description || '')
        setMeetingType(meetingData.meeting_type || 'online')
        setMeetingDate(meetingData.meeting_date || '')
        setMeetingTime(meetingData.meeting_time || '')
        setLocation(meetingData.location || '')
        setOnlineLink(meetingData.online_link || '')
        setDurationMinutes(meetingData.duration_minutes ? meetingData.duration_minutes.toString() : '')
        setMaxAttendees(meetingData.max_attendees ? meetingData.max_attendees.toString() : '')
      }
    } catch (error) {
      console.error('Error fetching meeting:', error)
      setError('Failed to load meeting.')
      navigate(`/groups/${groupSlug}`)
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Meeting title is required')
      return
    }

    if (!meetingDate) {
      setError('Meeting date is required')
      return
    }

    if (!meetingTime) {
      setError('Meeting time is required')
      return
    }

    if (meetingType === 'online' && !onlineLink.trim()) {
      setError('Online meeting link is required for online meetings')
      return
    }

    if (meetingType === 'offline' && !location.trim()) {
      setError('Location is required for offline meetings')
      return
    }

    if (!user || !group || !meeting) {
      setError('You must be signed in and be a member to edit a meeting')
      return
    }

    if (!canEdit) {
      setError('You do not have permission to edit this meeting')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase
        .from('group_meetings')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          meeting_type: meetingType,
          meeting_date: meetingDate,
          meeting_time: meetingTime,
          location: meetingType === 'offline' ? location.trim() : null,
          online_link: meetingType === 'online' ? onlineLink.trim() : null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null
        })
        .eq('id', meetingId)

      if (updateError) throw updateError

      // Navigate back to group detail page
      navigate(`/groups/${groupSlug}`)
    } catch (error) {
      console.error('Error updating meeting:', error)
      setError(error.message || 'Failed to update meeting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="create-post-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Sign in required</h2>
          <p>You need to sign in to edit a meeting.</p>
          <button onClick={() => navigate('/auth')} className="auth-btn">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (!group || !meeting) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Meeting not found</h2>
          <p>The meeting you're looking for doesn't exist.</p>
          <button onClick={() => navigate(`/groups/${groupSlug}`)} className="auth-btn">
            Back to Group
          </button>
        </div>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Permission Denied</h2>
          <p>You do not have permission to edit this meeting. Only the meeting creator or group admins can edit meetings.</p>
          <button onClick={() => navigate(`/groups/${groupSlug}`)} className="auth-btn">
            Back to Group
          </button>
        </div>
      </div>
    )
  }

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="create-post-page">
      <SEO
        title={`Edit Session - ${meeting.title}`}
        description={`Edit session details for ${group.name} on QuranNerds. Update meeting information, location, and preferences.`}
        keywords={`edit meeting, ${group.name}, group session, QuranNerds groups`}
        url={typeof window !== 'undefined' ? `${window.location.origin}/groups/${groupSlug}/meeting/${meetingId}/edit` : ''}
      />
      <div className="create-post-container">
        <h1 className="create-post-title">Edit Session</h1>
        <form onSubmit={handleSubmit} className="create-post-form">
          {error && (
            <div className="form-error" style={{ marginBottom: '20px', padding: '12px', background: 'rgba(220, 38, 38, 0.1)', borderRadius: '8px', color: 'rgba(220, 38, 38, 0.9)' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <input
              type="text"
              id="title"
              placeholder="Meeting Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <div className="form-group" style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '16px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Meeting Type *
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="meetingType"
                  value="online"
                  checked={meetingType === 'online'}
                  onChange={(e) => setMeetingType(e.target.value)}
                />
                <span>Online</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="meetingType"
                  value="offline"
                  checked={meetingType === 'offline'}
                  onChange={(e) => setMeetingType(e.target.value)}
                />
                <span>Offline</span>
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="meetingDate">
                Meeting Date *
              </label>
              <input
                type="date"
                id="meetingDate"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="form-input"
                min={today}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="meetingTime">
                Meeting Time *
              </label>
              <input
                type="time"
                id="meetingTime"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          {meetingType === 'online' ? (
            <div className="form-group">
              <label htmlFor="onlineLink">
                Meeting Link *
              </label>
              <input
                type="url"
                id="onlineLink"
                placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom link, etc."
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                className="form-input"
                required={meetingType === 'online'}
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="location">
                Location *
              </label>
              <input
                type="text"
                id="location"
                placeholder="Meeting location (e.g., Local Mosque, Community Center, Address)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="form-input"
                maxLength={200}
                required={meetingType === 'offline'}
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="durationMinutes">
                Duration (minutes)
              </label>
              <input
                type="number"
                id="durationMinutes"
                placeholder="e.g., 60"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="form-input"
                min="1"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxAttendees">
                Max Attendees
              </label>
              <input
                type="number"
                id="maxAttendees"
                placeholder="Leave empty for unlimited"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                className="form-input"
                min="1"
              />
            </div>
          </div>

          <div className="form-actions">
            <div className="form-actions-inner">
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupSlug}`)}
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-btn"
                disabled={loading || !title.trim() || !meetingDate || !meetingTime}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditGroupMeeting
