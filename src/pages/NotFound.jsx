import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import LogoIcon from '../components/LogoIcon'
import './NotFound.css'

function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-content">
          <LogoIcon size={64} className="not-found-icon" />
          
          <div className="not-found-number">404</div>
          
          <h1 className="not-found-title">Page Not Found</h1>
          
          <p className="not-found-text">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>
          
          <div className="not-found-actions">
            <Link to="/" className="not-found-button primary">
              <Home size={20} />
              <span>Go Home</span>
            </Link>
            
            <button 
              onClick={() => window.history.back()} 
              className="not-found-button secondary"
            >
              <ArrowLeft size={20} />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound

