import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import UserDropdown from './UserDropdown'
import './Navbar.css'

function Navbar({ user }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <BookOpen className="logo-icon" size={24} />
          <span className="logo-text">BD Quran Hub</span>
        </Link>
        
        <div className="navbar-links">
          <Link to="/about" className="navbar-link">
            About
          </Link>
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

