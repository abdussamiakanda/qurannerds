import { BookOpen, Users, Heart, Target } from 'lucide-react'
import './About.css'

function About() {
  return (
    <div className="about-page">
      <div className="about-container">
        <div className="about-header">
          <BookOpen size={48} className="about-icon" />
          <h1 className="about-title">About BD Quran Hub</h1>
          <p className="about-subtitle">
            A platform dedicated to sharing knowledge, insights, and reflections on the Quran
          </p>
        </div>

        <div className="about-content">
          <section className="about-section">
            <h2 className="section-title">Our Mission</h2>
            <p className="section-text">
              BD Quran Hub was created to provide a space where Muslims can come together to 
              share their study notes, reflections, and insights from the Quran. We believe 
              that knowledge grows when shared, and our platform facilitates meaningful 
              discussions and learning experiences.
            </p>
          </section>

          <section className="about-section">
            <h2 className="section-title">What We Offer</h2>
            <div className="features-grid">
              <div className="feature-card">
                <BookOpen size={32} className="feature-icon" />
                <h3 className="feature-title">Study Posts</h3>
                <p className="feature-text">
                  Share your reflections, notes, and insights from your Quran study journey
                </p>
              </div>
              <div className="feature-card">
                <Users size={32} className="feature-icon" />
                <h3 className="feature-title">Community</h3>
                <p className="feature-text">
                  Connect with fellow learners and engage in meaningful discussions
                </p>
              </div>
              <div className="feature-card">
                <Heart size={32} className="feature-icon" />
                <h3 className="feature-title">Engagement</h3>
                <p className="feature-text">
                  Like, comment, and interact with posts that inspire and educate
                </p>
              </div>
              <div className="feature-card">
                <Target size={32} className="feature-icon" />
                <h3 className="feature-title">Learning</h3>
                <p className="feature-text">
                  Discover new perspectives and deepen your understanding of the Quran
                </p>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2 className="section-title">Our Values</h2>
            <div className="values-list">
              <div className="value-item">
                <h3 className="value-title">Respect</h3>
                <p className="value-text">
                  We foster an environment of mutual respect and understanding, where diverse 
                  perspectives are welcomed and valued.
                </p>
              </div>
              <div className="value-item">
                <h3 className="value-title">Knowledge</h3>
                <p className="value-text">
                  We believe in the power of shared knowledge and continuous learning from 
                  the Quran and from each other.
                </p>
              </div>
              <div className="value-item">
                <h3 className="value-title">Community</h3>
                <p className="value-text">
                  We build a supportive community where members can grow together in their 
                  faith and understanding.
                </p>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2 className="section-title">Join Us</h2>
            <p className="section-text">
              Whether you're a student, teacher, or someone seeking to deepen your 
              understanding of the Quran, BD Quran Hub welcomes you. Create an account 
              to start sharing your insights, engaging with others, and contributing to 
              our growing community of learners.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default About

