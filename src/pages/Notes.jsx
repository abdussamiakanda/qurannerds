import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Eye, MessageCircle, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getExcerpt } from '../utils/textUtils'
import './Home.css'

function Notes({ user }) {
  const [notes, setNotes] = useState([])
  const [filteredNotes, setFilteredNotes] = useState([])
  const [authorProfiles, setAuthorProfiles] = useState({})
  const [notesStats, setNotesStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const notesData = data || []
      setNotes(notesData)
      setFilteredNotes(notesData)

      // Fetch profiles for all unique authors
      if (data && data.length > 0) {
        const noteIds = data.map(note => note.id)
        const authorIds = [...new Set(data.map(note => note.author_id).filter(Boolean))]
        
        if (authorIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, avatar_url, name')
            .in('id', authorIds)

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          }

          if (profiles) {
            const profilesMap = {}
            profiles.forEach(profile => {
              profilesMap[profile.id] = profile
            })
            setAuthorProfiles(profilesMap)
          }
        }

        // Fetch likes and comments counts for all notes
        if (noteIds.length > 0) {
          const [likesData, commentsData] = await Promise.all([
            supabase
              .from('post_likes')
              .select('post_id')
              .in('post_id', noteIds),
            supabase
              .from('comments')
              .select('post_id')
              .in('post_id', noteIds)
          ])

          const statsMap = {}
          noteIds.forEach(noteId => {
            statsMap[noteId] = {
              likes: 0,
              comments: 0,
              views: data.find(n => n.id === noteId)?.views || 0
            }
          })

          if (likesData.data) {
            likesData.data.forEach(like => {
              if (statsMap[like.post_id]) {
                statsMap[like.post_id].likes++
              }
            })
          }

          if (commentsData.data) {
            commentsData.data.forEach(comment => {
              if (statsMap[comment.post_id]) {
                statsMap[comment.post_id].comments++
              }
            })
          }

          setNotesStats(statsMap)
        }
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = notes.filter(note => {
      const titleMatch = note.title?.toLowerCase().includes(query)
      const contentMatch = note.content?.toLowerCase().includes(query)
      const authorMatch = note.author_name?.toLowerCase().includes(query) || 
                         note.author_email?.toLowerCase().includes(query)
      
      return titleMatch || contentMatch || authorMatch
    })
    setFilteredNotes(filtered)
  }, [searchQuery, notes])

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="home">
      <div className="home-header">
        <h1 className="home-title">Quran Study Notes</h1>
        <p className="home-subtitle">
          Share your reflections, insights, and learnings from the Quran
        </p>
      </div>

      <div className="notes-search-container">
        <div className="notes-search-wrapper">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            className="notes-search-input"
            placeholder="Search notes by title, content, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <div className="search-results-count">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} found
          </div>
        )}
      </div>

      <div className="posts-container">
        {notes.length === 0 ? (
          <div className="empty-state">
            <p>No notes yet. Be the first to share your Quran study insights!</p>
            {user && (
              <Link to="/create" className="create-first-post-btn">
                Create Your First Note
              </Link>
            )}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <p>No notes found matching "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="posts-grid">
            {filteredNotes.map((note) => {
              const authorProfile = authorProfiles[note.author_id]
              const authorAvatar = authorProfile?.avatar_url
              const authorName = authorProfile?.name || note.author_name || note.author_email || 'Anonymous'
              const authorInitial = authorName.charAt(0).toUpperCase()
              const stats = notesStats[note.id] || { likes: 0, comments: 0, views: 0 }

              return (
                <Link key={note.id} to={`/note/${note.id}`} className="post-card">
                  <div className="post-card-header">
                    <div className="post-author">
                      {authorAvatar && authorAvatar.trim() ? (
                        <img 
                          src={authorAvatar} 
                          alt={authorName} 
                          className="author-avatar-img"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div 
                        className="author-avatar"
                        style={{ display: authorAvatar && authorAvatar.trim() ? 'none' : 'flex' }}
                      >
                        {authorInitial}
                      </div>
                      <div className="author-info">
                        <div className="author-name">
                          {authorName}
                        </div>
                        <div className="post-date">{formatDate(note.created_at)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="post-card-content">
                    <h2 className="post-card-title">{note.title}</h2>
                    <p className="post-card-excerpt">{getExcerpt(note.content, 150)}</p>
                    <div className="post-card-footer">
                      <div className="post-card-stats">
                        <div className="post-stat-item">
                          <Heart size={16} />
                          <span>{stats.likes}</span>
                        </div>
                        <div className="post-stat-item">
                          <MessageCircle size={16} />
                          <span>{stats.comments}</span>
                        </div>
                        <div className="post-stat-item">
                          <Eye size={16} />
                          <span>{stats.views}</span>
                        </div>
                      </div>
                      <span className="read-more">Read more</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Notes

