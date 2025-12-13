import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import UserDropdown from './UserDropdown'
import LogoIcon from './LogoIcon'
import './Navbar.css'

function Navbar({ user }) {
  const { theme, toggleTheme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsMobileMenuOpen(false)
    navigate('/')
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={handleLinkClick}>
          <LogoIcon className="logo-icon" size={24} />
          <span className="logo-text">
            <span className="brand-quran">Quran</span>
            <span className="brand-nerds">Nerds</span>
          </span>
        </Link>
        
        {/* Desktop Links */}
        <div className="navbar-links desktop-links">
          <Link to="/read" className="navbar-link">
            Read
          </Link>
          <Link to="/notes" className="navbar-link">
            Notes
          </Link>
          <Link to="/groups" className="navbar-link">
            Groups
          </Link>
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          {user ? (
            <>
              <Link to="/dashboard" className="navbar-link create-link">
                Write
              </Link>
              <UserDropdown user={user} />
            </>
          ) : (
            <Link to="/auth" className="navbar-link auth-link">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={handleLinkClick} />
      )}

      {/* Mobile Menu */}
      <div 
        ref={mobileMenuRef}
        className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}
      >
        <div className="mobile-menu-content">
          <div className="mobile-menu-header">
            <Link to="/" className="mobile-menu-logo" onClick={handleLinkClick}>
              <LogoIcon className="logo-icon" size={24} />
              <span className="logo-text">
                <span className="brand-quran">Quran</span>
                <span className="brand-nerds">Nerds</span>
              </span>
            </Link>
            <button
              className="mobile-menu-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mobile-menu-links">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="mobile-menu-link mobile-menu-link-primary mobile-menu-link-top"
                  onClick={handleLinkClick}
                >
                  Write
                </Link>
                <div className="mobile-menu-divider"></div>
              </>
            ) : (
              <Link 
                to="/auth" 
                className="mobile-menu-link mobile-menu-link-primary mobile-menu-link-top"
                onClick={handleLinkClick}
              >
                Sign In
              </Link>
            )}
            <Link 
              to="/read" 
              className="mobile-menu-link"
              onClick={handleLinkClick}
            >
              Read
            </Link>
            <Link 
              to="/notes" 
              className="mobile-menu-link"
              onClick={handleLinkClick}
            >
              Notes
            </Link>
            <Link 
              to="/groups" 
              className="mobile-menu-link"
              onClick={handleLinkClick}
            >
              Groups
            </Link>
            {user && (
              <>
                <Link 
                  to="/profile" 
                  className="mobile-menu-link"
                  onClick={handleLinkClick}
                >
                  Profile
                </Link>
                <Link 
                  to="/settings" 
                  className="mobile-menu-link"
                  onClick={handleLinkClick}
                >
                  Settings
                </Link>
                <div className="mobile-menu-divider"></div>
                <button 
                  className="mobile-menu-link mobile-menu-link-logout"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

          <div className="mobile-menu-footer">
            <button 
              className="mobile-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon size={20} />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={20} />
                  <span>Light Mode</span>
                </>
              )}
            </button>
            {user && (
              <div className="mobile-user-info">
                <div className="mobile-user-avatar">
                  {user.user_metadata?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="mobile-user-details">
                  <div className="mobile-user-name">
                    {user.user_metadata?.name || 'User'}
                  </div>
                  <div className="mobile-user-email">
                    {user.email}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

