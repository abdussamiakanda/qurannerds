import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './UserDropdown.css'

function UserDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [userName, setUserName] = useState('')
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('avatar_url, name')
        .eq('id', user.id)
        .single()

      if (error) {
        // PGRST116 = no rows, 42P01 = table doesn't exist, 406 = RLS issue
        // Silently fail - profile might not exist yet
        return
      }

      if (profile) {
        if (profile.avatar_url && profile.avatar_url.trim()) {
          setAvatarUrl(profile.avatar_url)
        }
        if (profile.name) setUserName(profile.name)
      }
    } catch (error) {
      // Profile might not exist yet, that's okay
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    navigate('/')
  }

  const handleSettings = () => {
    setIsOpen(false)
    navigate('/settings')
  }

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button
        className="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        {avatarUrl && avatarUrl.trim() ? (
          <img 
            src={avatarUrl} 
            alt="Avatar" 
            className="user-avatar-img"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div 
          className="user-avatar"
          style={{ display: avatarUrl && avatarUrl.trim() ? 'none' : 'flex' }}
        >
          {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-user-info">
              {avatarUrl && avatarUrl.trim() ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="dropdown-avatar-img"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="dropdown-avatar"
                style={{ display: avatarUrl && avatarUrl.trim() ? 'none' : 'flex' }}
              >
                {userName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="dropdown-user-details">
                <div className="dropdown-user-name">
                  {userName || user?.user_metadata?.name || user?.email?.split('@')[0]}
                </div>
                <div className="dropdown-user-email">{user?.email}</div>
              </div>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>

          <Link to={`/profile/${user?.id}`} className="dropdown-item" onClick={() => setIsOpen(false)}>
            <span>Profile</span>
          </Link>

          <button onClick={handleSettings} className="dropdown-item">
            <span>Settings</span>
          </button>

          <div className="dropdown-divider"></div>

          <button onClick={handleLogout} className="dropdown-item">
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default UserDropdown

