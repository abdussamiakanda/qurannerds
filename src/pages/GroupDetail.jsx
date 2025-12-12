import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Users, BookOpen, Calendar, MapPin, Plus, UserPlus, UserMinus, Settings, Trash2, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import { createProfileSlug } from '../utils/textUtils'
import './GroupDetail.css'

function GroupDetail({ user }) {
  const { groupSlug } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [memberProfiles, setMemberProfiles] = useState({})
  const [meetings, setMeetings] = useState([])
  const [meetingCreators, setMeetingCreators] = useState({})
  const [isMember, setIsMember] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (groupSlug) {
      fetchGroup()
    }
  }, [groupSlug, user])

  const fetchGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('slug', groupSlug)
        .single()

      if (error) throw error
      setGroup(data)
      // Fetch members and meetings after group is loaded
      if (data) {
        fetchMembers(data.id)
        fetchMeetings(data.id)
      }
    } catch (error) {
      console.error('Error fetching group:', error)
      navigate('/groups')
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async (groupId) => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError

      setMembers(membersData || [])

      // Check if current user is a member
      if (user && membersData) {
        const userMember = membersData.find(m => m.user_id === user.id)
        setIsMember(!!userMember)
        setUserRole(userMember?.role || null)
      }

      // Fetch profiles for members
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id).filter(Boolean)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', userIds)

        if (profiles) {
          const profilesMap = {}
          profiles.forEach(profile => {
            profilesMap[profile.id] = profile
          })
          setMemberProfiles(profilesMap)
        }
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchMeetings = async (groupId) => {
    try {
      // Fetch upcoming meetings (meeting_date >= today)
      const today = new Date().toISOString().split('T')[0]
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('group_meetings')
        .select('*')
        .eq('group_id', groupId)
        .gte('meeting_date', today)
        .order('meeting_date', { ascending: true })
        .order('meeting_time', { ascending: true })

      if (meetingsError) throw meetingsError

      setMeetings(meetingsData || [])

      // Fetch creator profiles
      if (meetingsData && meetingsData.length > 0) {
        const creatorIds = [...new Set(meetingsData.map(m => m.created_by).filter(Boolean))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', creatorIds)

        if (profiles) {
          const profilesMap = {}
          profiles.forEach(profile => {
            profilesMap[profile.id] = profile
          })
          setMeetingCreators(profilesMap)
        }
      }
    } catch (error) {
      console.error('Error fetching meetings:', error)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const formatMeetingDate = (dateString, timeString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    const formattedDate = date.toLocaleDateString('en-US', options)
    
    if (timeString) {
      // Convert 24-hour time to 12-hour format with AM/PM
      const [hours, minutes] = timeString.split(':')
      const hour24 = parseInt(hours, 10)
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
      const ampm = hour24 >= 12 ? 'PM' : 'AM'
      const formattedTime = `${hour12}:${minutes} ${ampm}`
      return `${formattedDate} at ${formattedTime}`
    }
    
    return formattedDate
  }

  const handleJoinGroup = async () => {
    if (!user) {
      navigate('/auth')
      return
    }

    setJoining(true)
    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: group.id,
          user_id: user.id,
          role: 'member'
        }])

      if (error) throw error

      setIsMember(true)
      setUserRole('member')
      fetchMembers(group.id) // Refresh members list
      fetchMeetings(group.id) // Refresh meetings list
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group. You may already be a member.')
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!user) return

    if (!window.confirm('Are you sure you want to leave this group?')) {
      return
    }

    setLeaving(true)
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', group.id)
        .eq('user_id', user.id)

      if (error) throw error

      setIsMember(false)
      setUserRole(null)
      fetchMembers(group.id) // Refresh members list
      fetchMeetings(group.id) // Refresh meetings list
    } catch (error) {
      console.error('Error leaving group:', error)
      alert('Failed to leave group.')
    } finally {
      setLeaving(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!user || userRole !== 'admin') return

    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('study_groups')
        .delete()
        .eq('id', group.id)

      if (error) throw error

      navigate('/groups')
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Failed to delete group.')
    }
  }

  const handleDeleteMeeting = async (meetingId) => {
    if (!user) return

    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('group_meetings')
        .delete()
        .eq('id', meetingId)

      if (error) throw error

      // Refresh meetings list
      if (group) {
        fetchMeetings(group.id)
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
      alert('Failed to delete session. You may not have permission.')
    }
  }

  if (loading) {
    return (
      <div className="group-detail-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="group-detail-not-found">
        <h2>Group not found</h2>
        <Link to="/groups" className="back-link">Back to Groups</Link>
      </div>
    )
  }

  const canManage = userRole === 'admin' || userRole === 'moderator'
  const isCreator = user && group.created_by === user.id

  return (
    <div className="group-detail-page">
      <SEO
        title={group.name}
        description={group.description || `Join ${group.name} on QuranNerds. ${group.topic ? `Focus: ${group.topic}` : 'Study the Quran together with fellow learners.'}`}
        keywords={`${group.name}, Quran study group, ${group.topic || ''}, Islamic study, QuranNerds`}
        url={typeof window !== 'undefined' ? `${window.location.origin}/groups/${groupSlug}` : ''}
      />

      <div className="group-detail-container">
        <div className="group-detail-header">
          <div className="group-detail-header-content">
            <div className="group-detail-title-section">
              <h1 className="group-detail-title">{group.name}</h1>
            </div>
            {group.description && (
              <p className="group-detail-description">{group.description}</p>
            )}
            <div className="group-detail-meta">
              {group.topic && (
                <span className="group-meta-item">
                  <BookOpen size={16} />
                  {group.topic}
                </span>
              )}
              {group.meeting_day && (
                <span className="group-meta-item">
                  <Calendar size={16} />
                  {group.meeting_day} {group.meeting_time && `at ${group.meeting_time}`}
                </span>
              )}
              {group.location && (
                <span className="group-meta-item">
                  <MapPin size={16} />
                  {group.location}
                </span>
              )}
              <span className="group-meta-item">
                <Users size={16} />
                {members.length} {members.length === 1 ? 'member' : 'members'}
                {group.max_members && ` / ${group.max_members} max`}
              </span>
            </div>
          </div>

          <div className="group-detail-actions">
            {user ? (
              <>
                {isMember ? (
                  <button
                    className="leave-group-btn"
                    onClick={handleLeaveGroup}
                    disabled={leaving || isCreator}
                    title={isCreator ? 'Creators cannot leave their own group' : 'Leave group'}
                  >
                    <UserMinus size={18} />
                    {leaving ? 'Leaving...' : 'Leave Group'}
                  </button>
                ) : (
                  <button
                    className="join-group-btn"
                    onClick={handleJoinGroup}
                    disabled={joining || (group.max_members && members.length >= group.max_members)}
                    title={group.max_members && members.length >= group.max_members ? 'Group is full' : 'Join group'}
                  >
                    <UserPlus size={18} />
                    {joining ? 'Joining...' : 'Join Group'}
                  </button>
                )}
                {canManage && (
                  <button
                    className="manage-group-btn"
                    onClick={() => navigate(`/groups/${groupSlug}/settings`)}
                  >
                    <Settings size={18} />
                    Manage
                  </button>
                )}
                {isCreator && (
                  <button
                    className="delete-group-btn"
                    onClick={handleDeleteGroup}
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                )}
              </>
            ) : (
              <Link to="/auth" className="join-group-btn">
                <UserPlus size={18} />
                Sign In to Join
              </Link>
            )}
          </div>
        </div>

        <div className="group-detail-content">
          <div className="group-members-section">
            <h2 className="section-title">Members ({members.length})</h2>
            <div className="members-grid">
              {members.map((member) => {
                const profile = memberProfiles[member.user_id]
                const memberName = profile?.name || 'Anonymous'
                const memberAvatar = profile?.avatar_url
                const memberInitial = memberName.charAt(0).toUpperCase()
                const profileSlug = createProfileSlug(memberName)

                return (
                  <Link
                    key={member.id}
                    to={`/profile/${profileSlug}`}
                    className="member-card"
                  >
                    {memberAvatar && memberAvatar.trim() ? (
                      <img
                        src={memberAvatar}
                        alt={memberName}
                        className="member-avatar-img"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className="member-avatar"
                      style={{ display: memberAvatar && memberAvatar.trim() ? 'none' : 'flex' }}
                    >
                      {memberInitial}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{memberName}</div>
                      <div className="member-role">{member.role}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="group-posts-section">
            <div className="section-header">
              <h2 className="section-title">Group Sessions</h2>
              {isMember && (
                <button
                  className="new-post-btn"
                  onClick={() => navigate(`/groups/${groupSlug}/meeting/create`)}
                >
                  <Plus size={18} />
                  Schedule Session
                </button>
              )}
            </div>
            {meetings.length === 0 ? (
              <div className="group-posts-empty">
                <p>No upcoming sessions scheduled. {isMember ? 'Be the first to schedule a session!' : 'Join the group to schedule sessions.'}</p>
              </div>
            ) : (
              <div className="group-posts-list">
                {meetings.map((meeting) => {
                  const creatorProfile = meetingCreators[meeting.created_by]
                  const creatorName = creatorProfile?.name || 'Anonymous'
                  const creatorAvatar = creatorProfile?.avatar_url
                  const creatorInitial = creatorName.charAt(0).toUpperCase()
                  const isMeetingCreator = user && meeting.created_by === user.id
                  const canManageMeeting = isMeetingCreator || isCreator || userRole === 'admin'

                  return (
                    <div
                      key={meeting.id}
                      className="group-meeting-card"
                    >
                      <div className="group-meeting-header">
                        <div className="group-meeting-title-section">
                          <h3 className="group-meeting-title">{meeting.title}</h3>
                          <span className={`group-meeting-type ${meeting.meeting_type}`}>
                            {meeting.meeting_type === 'online' ? '🌐 Online' : '📍 Offline'}
                          </span>
                        </div>
                        <div className="group-meeting-creator">
                          {creatorAvatar && creatorAvatar.trim() ? (
                            <img
                              src={creatorAvatar}
                              alt={creatorName}
                              className="group-meeting-avatar-img"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div
                            className="group-meeting-avatar"
                            style={{ display: creatorAvatar && creatorAvatar.trim() ? 'none' : 'flex' }}
                          >
                            {creatorInitial}
                          </div>
                          <span className="group-meeting-creator-name">{creatorName}</span>
                        </div>
                      </div>
                      {meeting.description && (
                        <p className="group-meeting-description">{meeting.description}</p>
                      )}
                      <div className="group-meeting-details">
                        <div className="group-meeting-detail-item">
                          <Calendar size={16} />
                          <span>{formatMeetingDate(meeting.meeting_date, meeting.meeting_time)}</span>
                        </div>
                        {user && meeting.meeting_type === 'online' && meeting.online_link && (
                          <div className="group-meeting-detail-item">
                            <MapPin size={16} />
                            <a href={meeting.online_link} target="_blank" rel="noopener noreferrer" className="group-meeting-link">
                              {meeting.online_link}
                            </a>
                          </div>
                        )}
                        {user && meeting.meeting_type === 'offline' && meeting.location && (
                          <div className="group-meeting-detail-item">
                            <MapPin size={16} />
                            <span>{meeting.location}</span>
                          </div>
                        )}
                        {meeting.duration_minutes && (
                          <div className="group-meeting-detail-item">
                            <span>Duration: {meeting.duration_minutes} minutes</span>
                          </div>
                        )}
                        {meeting.max_attendees && (
                          <div className="group-meeting-detail-item">
                            <Users size={16} />
                            <span>Max {meeting.max_attendees} attendees</span>
                          </div>
                        )}
                      </div>
                      {canManageMeeting && (
                        <div className="group-meeting-actions">
                          <button
                            onClick={() => navigate(`/groups/${groupSlug}/meeting/${meeting.id}/edit`)}
                            className="group-meeting-action-btn edit"
                          >
                            <Edit2 size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMeeting(meeting.id)}
                            className="group-meeting-action-btn delete"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupDetail
