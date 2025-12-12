import { useState, useEffect } from 'react'
import { Trophy, Flame, Star, Award, PenTool, BookOpen, Edit, GraduationCap, Crown, MessageCircle, Users } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { getUserPoints, getUserStreak, getUserAchievements, calculateLevelProgress } from '../utils/gamification'
import './GamificationStats.css'

function GamificationStats({ userId }) {
  const [pointsData, setPointsData] = useState(null)
  const [streakData, setStreakData] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [points, streak, userAchievements] = await Promise.all([
          getUserPoints(userId),
          getUserStreak(userId),
          getUserAchievements(userId)
        ])

        setPointsData(points)
        setStreakData(streak)
        setAchievements(userAchievements)
      } catch (error) {
        console.error('Error fetching gamification data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  if (loading) {
    return (
      <div className="gamification-stats">
        <div className="gamification-loading">Loading stats...</div>
      </div>
    )
  }

  if (!pointsData) {
    return null
  }

  const levelProgress = calculateLevelProgress(pointsData)

  return (
    <div className="gamification-stats">
      <div className="gamification-card">
        <div className="gamification-header">
          <Star className="gamification-icon" size={20} />
          <h3 className="gamification-title">Level {pointsData.level}</h3>
        </div>
        <div className="level-progress">
          <div className="level-progress-bar">
            <div 
              className="level-progress-fill" 
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="level-progress-text">
            {pointsData.total_points_earned} / {pointsData.level ** 2 * 100} XP
          </div>
        </div>
        <div className="points-display">
          <span className="points-label">Total Points:</span>
          <span className="points-value">{pointsData.total_points_earned.toLocaleString()}</span>
        </div>
      </div>

      <div className="gamification-card">
        <div className="gamification-header">
          <Flame className="gamification-icon" size={20} />
          <h3 className="gamification-title">Streak</h3>
        </div>
        <div className="streak-display">
          <div className="streak-current">
            <span className="streak-number">{streakData?.current_streak || 0}</span>
            <span className="streak-label">days</span>
          </div>
          <div className="streak-longest">
            Best: {streakData?.longest_streak || 0} days
          </div>
        </div>
      </div>

      <div className="gamification-card">
        <div className="gamification-header">
          <Trophy className="gamification-icon" size={20} />
          <h3 className="gamification-title">Achievements</h3>
        </div>
        <div className="achievements-display">
          <div className="achievements-count">
            {achievements.length} unlocked
          </div>
          <div className="achievements-preview">
            {achievements.slice(0, 3).map((ua) => {
              const IconComponent = ua.achievements?.icon && LucideIcons[ua.achievements.icon] 
                ? LucideIcons[ua.achievements.icon] 
                : Trophy
              
              return (
                <div 
                  key={ua.id} 
                  className="achievement-badge"
                  style={{ 
                    backgroundColor: ua.achievements?.badge_color || '#4CAF50',
                    opacity: 0.9
                  }}
                  title={ua.achievements?.name}
                >
                  <IconComponent size={24} />
                </div>
              )
            })}
            {achievements.length > 3 && (
              <div className="achievement-badge-more">
                +{achievements.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamificationStats
