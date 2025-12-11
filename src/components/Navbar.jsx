import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import UserDropdown from './UserDropdown'
import LogoIcon from './LogoIcon'
import './Navbar.css'

function Navbar({ user }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <LogoIcon className="logo-icon" size={24} />
          <span className="logo-text">QuranNerds</span>
        </Link>
        
        <div className="navbar-links">
          <Link to="/about" className="navbar-link">
            About
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
      </div>
    </nav>
  )
}

export default Navbar

