import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import './CreatePost.css'

function CreateGroupMeeting({ user }) {
  const { groupSlug } = useParams()
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
  const [isMember, setIsMember] = useState(false)
  const [error, setError] = useState('')

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
      setError('Failed to load group. You may not have permission to create meetings here.')
      navigate('/groups')
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

    if (!user || !group) {
      setError('You must be signed in and be a member to create a meeting')
      return
    }

    if (!isMember) {
      setError('You must be a member of this group to create meetings')
      return
    }

    setLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from('group_meetings')
        .insert([
          {
            group_id: group.id,
            created_by: user.id,
            title: title.trim(),
            description: description.trim() || null,
            meeting_type: meetingType,
            meeting_date: meetingDate,
            meeting_time: meetingTime,
            location: meetingType === 'offline' ? location.trim() : null,
            online_link: meetingType === 'online' ? onlineLink.trim() : null,
            duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
            max_attendees: maxAttendees ? parseInt(maxAttendees) : null
          }
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Navigate back to group detail page
      navigate(`/groups/${groupSlug}`)
    } catch (error) {
      console.error('Error creating meeting:', error)
      setError(error.message || 'Failed to create meeting. Please try again.')
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
          <p>You need to sign in to create a meeting.</p>
          <button onClick={() => navigate('/auth')} className="auth-btn">
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Group not found</h2>
          <p>The group you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/groups')} className="auth-btn">
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  if (!isMember) {
    return (
      <div className="create-post-page">
        <div className="auth-required">
          <h2>Membership Required</h2>
          <p>You must be a member of this group to create meetings.</p>
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
        title={`Schedule Session in ${group.name}`}
        description={`Schedule a new study session for ${group.name} on QuranNerds. Set up meeting details, location, and invite group members.`}
        keywords={`schedule meeting, ${group.name}, group session, QuranNerds groups`}
        url={typeof window !== 'undefined' ? `${window.location.origin}/groups/${groupSlug}/meeting/create` : ''}
      />
      <div className="create-post-container">
        <h1 className="create-post-title">Schedule Session in {group.name}</h1>
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
                {loading ? 'Scheduling...' : 'Schedule Session'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateGroupMeeting
