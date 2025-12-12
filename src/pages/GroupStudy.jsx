import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, BookOpen, Calendar, MapPin, Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import './Home.css'

function GroupStudy({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      // Fetch all public groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (groupsError) throw groupsError

      // Fetch member counts for each group
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map(g => g.id)
        
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select('group_id')
          .in('group_id', groupIds)

        if (membersError) {
          console.error('Error fetching members:', membersError)
        }

        // Count members per group
        const memberCounts = {}
        if (membersData) {
          membersData.forEach(member => {
            memberCounts[member.group_id] = (memberCounts[member.group_id] || 0) + 1
          })
        }

        // Add member counts to groups
        const groupsWithCounts = groupsData.map(group => ({
          ...group,
          member_count: memberCounts[group.id] || 0
        }))

        setGroups(groupsWithCounts)
      } else {
        setGroups([])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="home">
      <SEO
        title="Group Study"
        description="Join or create Quran study groups on QuranNerds. Study together with fellow learners, share insights, and deepen your understanding of the Quran in a collaborative environment."
        keywords="Quran study groups, Islamic study groups, collaborative Quran learning, group study, QuranNerds groups"
        url={typeof window !== 'undefined' ? `${window.location.origin}/groups` : ''}
      />
      
      <div className="home-header">
        <h1 className="home-title">Group Study</h1>
        <p className="home-subtitle">
          Join or create study groups to learn and discuss the Quran together
        </p>
        {user && (
          <div style={{ marginTop: '24px' }}>
            <button
              className="new-post-btn"
              onClick={() => navigate('/groups/create')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={18} style={{ marginRight: '8px', display: 'inline-block' }} />
              Create Group
            </button>
          </div>
        )}
      </div>

      <div className="notes-search-container">
        <div className="notes-search-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="notes-search-input"
            placeholder="Search study groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

        {loading ? (
          <div className="home-loading">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="empty-state">
            <p>
              {searchQuery
                ? `No groups match "${searchQuery}". Try different keywords.`
                : user
                ? 'No study groups yet. Be the first to create a study group!'
                : 'Sign in to create or join study groups.'}
            </p>
            {user && !searchQuery && (
              <button
                className="create-first-post-btn"
                onClick={() => navigate('/groups/create')}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={18} style={{ marginRight: '8px', display: 'inline-block' }} />
                Create Your First Group
              </button>
            )}
            {!user && (
              <Link 
                to="/auth" 
                className="create-first-post-btn"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Sign In to Get Started
              </Link>
            )}
          </div>
        ) : (
          <div className="posts-grid">
            {filteredGroups.map((group) => (
              <div key={group.id} className="post-card group-card">
                <div className="post-card-header">
                  <h3 className="post-card-title">{group.name}</h3>
                  <span className="post-card-meta-header">
                    <Users size={14} />
                    {group.member_count || 0} members
                  </span>
                </div>
                {group.description && (
                  <p className="post-card-excerpt">{group.description}</p>
                )}
                <div className="group-card-meta">
                  {group.topic && (
                    <span className="group-meta-item">
                      <BookOpen size={14} />
                      {group.topic}
                    </span>
                  )}
                  {group.meeting_day && (
                    <span className="group-meta-item">
                      <Calendar size={14} />
                      {group.meeting_day}
                    </span>
                  )}
                  {group.location && (
                    <span className="group-meta-item">
                      <MapPin size={14} />
                      {group.location}
                    </span>
                  )}
                </div>
                <div className="group-card-actions">
                  <button
                    className="new-post-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/groups/${group.slug}`)
                    }}
                  >
                    View Group
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

export default GroupStudy
