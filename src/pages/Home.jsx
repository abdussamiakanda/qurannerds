import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Heart, Target, FileText, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LogoIcon from '../components/LogoIcon'
import './Home.css'

function Home() {
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalUsers: 0,
    totalLikes: 0,
    totalComments: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch total notes count
      const { count: notesCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })

      // Fetch total users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Fetch total likes count
      const { count: likesCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })

      // Fetch total comments count
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalNotes: notesCount || 0,
        totalUsers: usersCount || 0,
        totalLikes: likesCount || 0,
        totalComments: commentsCount || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Welcome to <span className="hero-brand">
                  <span className="brand-quran">Quran</span>
                  <span className="brand-nerds">Nerds</span>
                </span>
              </h1>
              <p className="hero-subtitle">
                A platform dedicated to sharing knowledge, insights, and reflections on the Quran. 
                Join our community of learners and scholars.
              </p>
              <div className="hero-actions">
                <Link to="/notes" className="hero-btn primary">
                  Explore Notes
                </Link>
              </div>
            </div>
            <div className="hero-image">
              <LogoIcon size={400} className="hero-icon" />
            </div>
          </div>
        </div>
      </section>

      {/* About Content */}
      <div className="home-about">
        <div className="home-about-container">
          <div className="about-header">
            <LogoIcon size={48} className="about-icon" />
            <h2 className="about-title">
              About <span className="brand-quran">Quran</span><span className="brand-nerds">Nerds</span>
            </h2>
            <p className="about-subtitle">
              A platform dedicated to sharing knowledge, insights, and reflections on the Quran
            </p>
          </div>

          {/* Stats Section */}
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FileText size={32} />
                </div>
                <div className="stat-value">{statsLoading ? '...' : formatNumber(stats.totalNotes)}</div>
                <div className="stat-label">Total Notes</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <Users size={32} />
                </div>
                <div className="stat-value">{statsLoading ? '...' : formatNumber(stats.totalUsers)}</div>
                <div className="stat-label">Active Members</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <Heart size={32} />
                </div>
                <div className="stat-value">{statsLoading ? '...' : formatNumber(stats.totalLikes)}</div>
                <div className="stat-label">Total Likes</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <MessageSquare size={32} />
                </div>
                <div className="stat-value">{statsLoading ? '...' : formatNumber(stats.totalComments)}</div>
                <div className="stat-label">Comments</div>
              </div>
            </div>
          </div>

          <div className="about-content">
            <section className="about-section">
              <h3 className="section-title">Our Mission</h3>
              <p className="section-text">
                QuranNerds was created to provide a space where Muslims can come together to 
                share their study notes, reflections, and insights from the Quran. We believe 
                that knowledge grows when shared, and our platform facilitates meaningful 
                discussions and learning experiences.
              </p>
            </section>

            <section className="about-section">
              <h3 className="section-title">What We Offer</h3>
              <div className="features-grid">
                <div className="feature-card">
                  <BookOpen size={32} className="feature-icon" />
                  <h4 className="feature-title">Study Notes</h4>
                  <p className="feature-text">
                    Share your reflections, notes, and insights from your Quran study journey
                  </p>
                </div>
                <div className="feature-card">
                  <Users size={32} className="feature-icon" />
                  <h4 className="feature-title">Community</h4>
                  <p className="feature-text">
                    Connect with fellow learners and engage in meaningful discussions
                  </p>
                </div>
                <div className="feature-card">
                  <Heart size={32} className="feature-icon" />
                  <h4 className="feature-title">Engagement</h4>
                  <p className="feature-text">
                    Like, comment, and interact with notes that inspire and educate
                  </p>
                </div>
                <div className="feature-card">
                  <Target size={32} className="feature-icon" />
                  <h4 className="feature-title">Learning</h4>
                  <p className="feature-text">
                    Discover new perspectives and deepen your understanding of the Quran
                  </p>
                </div>
              </div>
            </section>

            <section className="about-section">
              <h3 className="section-title">Our Values</h3>
              <div className="values-list">
                <div className="value-item">
                  <h4 className="value-title">Respect</h4>
                  <p className="value-text">
                    We foster an environment of mutual respect and understanding, where diverse 
                    perspectives are welcomed and valued.
                  </p>
                </div>
                <div className="value-item">
                  <h4 className="value-title">Knowledge</h4>
                  <p className="value-text">
                    We believe in the power of shared knowledge and continuous learning from 
                    the Quran and from each other.
                  </p>
                </div>
                <div className="value-item">
                  <h4 className="value-title">Community</h4>
                  <p className="value-text">
                    We build a supportive community where members can grow together in their 
                    faith and understanding.
                  </p>
                </div>
              </div>
            </section>

            <section className="about-section join-section">
              <div className="join-content">
                <h3 className="section-title">Join Us</h3>
                <p className="section-text">
                  Whether you're a student, teacher, or someone seeking to deepen your 
                  understanding of the Quran, <span className="brand-quran">Quran</span><span className="brand-nerds">Nerds</span> welcomes you. Create an account 
                  to start sharing your insights, engaging with others, and contributing to 
                  our growing community of learners.
                </p>
                <Link to="/auth" className="join-cta-btn">
                  Get Started
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
