import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { createProfileSlug, createNoteSlug } from '../utils/textUtils'
import { sendCommentCreatedNotification } from '../utils/emailService'
import { MessageCircle, Trash2, Edit2 } from 'lucide-react'
import './Comments.css'

function Comments({ postId, user, noteSlug, noteTitle }) {
  const [comments, setComments] = useState([])
  const [commentProfiles, setCommentProfiles] = useState({})
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])

      // Fetch profiles for comment authors
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, avatar_url, name')
            .in('id', userIds)

          if (profiles) {
            const profilesMap = {}
            profiles.forEach(profile => {
              profilesMap[profile.id] = profile
            })
            setCommentProfiles(profilesMap)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('Please sign in to comment')
      return
    }

    if (!newComment.trim()) return

    setLoading(true)
    try {
      // Fetch note data first (for email notification)
      const { data: noteData } = await supabase
        .from('posts')
        .select('id, title, author_id')
        .eq('id', postId)
        .single()

      const { data: commentData, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            content: newComment.trim()
          }
        ])
        .select()
        .single()

      if (error) throw error

      setNewComment('')
      fetchComments()

      // Send email notifications
      if (noteData && commentData) {
        try {
          // Get recipients: note author + other commenters
          const recipients = []
          let noteAuthor = null
          
          // Add note author
          if (noteData.author_id) {
            const { data: authorProfile } = await supabase
              .from('profiles')
              .select('id, email, name')
              .eq('id', noteData.author_id)
              .single()
            
            if (authorProfile && authorProfile.email) {
              recipients.push(authorProfile)
              noteAuthor = authorProfile
            }
          }

          // Add other commenters (excluding current commenter)
          const { data: otherComments } = await supabase
            .from('comments')
            .select('user_id')
            .eq('post_id', postId)
            .neq('user_id', user.id)
            .neq('id', commentData.id)

          if (otherComments && otherComments.length > 0) {
            const commenterIds = [...new Set(otherComments.map(c => c.user_id).filter(Boolean))]
            if (commenterIds.length > 0) {
              const { data: commenterProfiles } = await supabase
                .from('profiles')
                .select('id, email, name')
                .in('id', commenterIds)
                .not('email', 'is', null)

              if (commenterProfiles) {
                // Add commenters that aren't already in recipients
                commenterProfiles.forEach(profile => {
                  if (!recipients.find(r => r.id === profile.id)) {
                    recipients.push(profile)
                  }
                })
              }
            }
          }

          if (recipients.length > 0) {
            const computedNoteSlug = noteSlug || createNoteSlug(noteData.title, noteData.id)
            
            // Fetch full note content for excerpt
            const { data: fullNoteData } = await supabase
              .from('posts')
              .select('content')
              .eq('id', postId)
              .single()
            
            // Send emails (don't wait for completion)
            sendCommentCreatedNotification({
              comment: commentData,
              commenter: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.email?.split('@')[0]
              },
              note: {
                id: noteData.id,
                title: noteData.title,
                slug: computedNoteSlug,
                content: fullNoteData?.content || ''
              },
              noteAuthor: noteAuthor,
              recipients: recipients,
            }).catch(error => {
              console.error('Error sending email notifications:', error)
              // Don't block UI if email fails
            })
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError)
          // Don't block UI if email fails
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error
      fetchComments()
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) {
      setEditingId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)

      if (error) throw error

      setEditingId(null)
      setEditContent('')
      fetchComments()
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="comments-section">
      <div className="comments-header">
        <MessageCircle size={20} />
        <h3 className="comments-title">Comments ({comments.length})</h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmitComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="comment-input"
            rows={3}
            maxLength={1000}
          />
          <div className="comment-form-actions">
            <button
              type="submit"
              className="comment-submit-btn"
              disabled={loading || !newComment.trim()}
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="comment-signin-prompt">
          <p>Sign in to leave a comment</p>
        </div>
      )}

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const profile = commentProfiles[comment.user_id]
            const isAuthor = user && user.id === comment.user_id
            const isEditing = editingId === comment.id

            return (
              <div key={comment.id} className="comment-item">
                <Link 
                  to={`/profile/${createProfileSlug(profile?.name || comment.author_name || comment.author_email || 'user')}`}
                  className="comment-avatar-link"
                >
                  <div className="comment-avatar">
                    {profile?.avatar_url && profile.avatar_url.trim() ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.name}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div 
                      className="comment-avatar-fallback"
                      style={{ display: profile?.avatar_url && profile.avatar_url.trim() ? 'none' : 'flex' }}
                    >
                      {(profile?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </Link>
                <div className="comment-content-wrapper">
                  <div className="comment-header">
                    <Link 
                      to={`/profile/${createProfileSlug(profile?.name || comment.author_name || comment.author_email || 'user')}`}
                      className="comment-author-name"
                    >
                      {profile?.name || 'Anonymous'}
                    </Link>
                    <span className="comment-date">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="comment-edit-form">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="comment-edit-input"
                        rows={3}
                        autoFocus
                      />
                      <div className="comment-edit-actions">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          className="comment-save-btn"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditContent('')
                          }}
                          className="comment-cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="comment-text">{comment.content}</div>
                  )}
                  {isAuthor && !isEditing && (
                    <div className="comment-actions">
                      <button
                        onClick={() => {
                          setEditingId(comment.id)
                          setEditContent(comment.content)
                        }}
                        className="comment-action-btn"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="comment-action-btn delete"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Comments

