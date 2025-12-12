import { supabase } from '../lib/supabase'

/**
 * Award points to a user for an activity
 * @param {string} userId - User ID
 * @param {number} points - Points to award
 * @param {string} activityType - Type of activity ('post_created', 'post_read', 'comment_added', etc.)
 * @param {string} activityId - Optional ID of the activity (post ID, comment ID, etc.)
 * @param {string} description - Optional description
 */
export async function awardPoints(userId, points, activityType, activityId = null, description = null) {
  try {
    const { error } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_points: points,
      p_activity_type: activityType,
      p_activity_id: activityId,
      p_description: description
    })

    if (error) {
      console.error('Error awarding points:', error)
      return false
    }

    // Update daily activity
    await supabase.rpc('update_daily_activity', {
      p_user_id: userId,
      p_activity_type: activityType,
      p_points: points
    })

    // Update streak if it's a qualifying activity
    if (activityType === 'post_created' || activityType === 'post_read') {
      await supabase.rpc('update_user_streak', {
        p_user_id: userId,
        p_streak_type: 'daily'
      })
    }

    // Check for new achievements
    await checkAchievements(userId)

    return true
  } catch (error) {
    console.error('Error in awardPoints:', error)
    return false
  }
}

/**
 * Get user's points and level information
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User points data
 */
export async function getUserPoints(userId) {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user points:', error)
      return null
    }

    // If no record found, create one
    if (!data) {
      const { data: newData, error: createError } = await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          points: 0,
          total_points_earned: 0,
          level: 1,
          xp_to_next_level: 100
        })
        .select()
        .maybeSingle()

      if (createError) {
        // If it's a conflict error, try to fetch again
        if (createError.code === '23505') {
          const { data: existingData } = await supabase
            .from('user_points')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          return existingData
        }
        console.error('Error creating user_points:', createError)
        return null
      }

      return newData
    }

    return data
  } catch (error) {
    console.error('Error in getUserPoints:', error)
    return null
  }
}

/**
 * Get user's streak information
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User streak data
 */
export async function getUserStreak(userId) {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', 'daily')
      .maybeSingle()

    if (error) {
      console.error('Error fetching user streak:', error)
      return {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null
      }
    }

    return data || {
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null
    }
  } catch (error) {
    console.error('Error in getUserStreak:', error)
    return {
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null
    }
  }
}

/**
 * Get user's achievements
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of user achievements
 */
export async function getUserAchievements(userId) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievements (*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) {
      console.error('Error fetching user achievements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserAchievements:', error)
    return []
  }
}

/**
 * Get all available achievements
 * @returns {Promise<Array>} Array of all achievements
 */
export async function getAllAchievements() {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('requirement_value', { ascending: true })

    if (error) {
      console.error('Error fetching achievements:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllAchievements:', error)
    return []
  }
}

/**
 * Check if user qualifies for any new achievements
 * @param {string} userId - User ID
 */
export async function checkAchievements(userId) {
  try {
    // Get user stats
    const pointsData = await getUserPoints(userId)
    const streakData = await getUserStreak(userId)

    if (!pointsData) return

    // Get all achievements
    const achievements = await getAllAchievements()

    // Get user's current achievements
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const unlockedIds = new Set((userAchievements || []).map(ua => ua.achievement_id))

    // Check each achievement
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue

      let qualifies = false

      switch (achievement.requirement_type) {
        case 'post_count':
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('author_id', userId)
          qualifies = (postCount || 0) >= achievement.requirement_value
          break

        case 'streak_days':
          qualifies = (streakData?.current_streak || 0) >= achievement.requirement_value
          break

        case 'total_points':
          qualifies = (pointsData.total_points_earned || 0) >= achievement.requirement_value
          break

        case 'level':
          qualifies = (pointsData.level || 1) >= achievement.requirement_value
          break

        case 'comment_count':
          const { count: commentCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
          qualifies = (commentCount || 0) >= achievement.requirement_value
          break
      }

      if (qualifies) {
        // Unlock achievement
        await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id
          })

        // Award points for achievement
        if (achievement.points_reward > 0) {
          await awardPoints(userId, achievement.points_reward, 'achievement_unlocked', achievement.id, `Unlocked: ${achievement.name}`)
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
  }
}

/**
 * Get leaderboard data
 * @param {string} type - 'points', 'posts', 'streak'
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Leaderboard data
 */
export async function getLeaderboard(type = 'points', limit = 10) {
  try {
    let data, error

    switch (type) {
      case 'points':
        const { data: pointsData, error: pointsError } = await supabase
          .from('user_points')
          .select('*')
          .order('total_points_earned', { ascending: false })
          .limit(limit)
        
        data = pointsData
        error = pointsError
        
        if (!error && data && data.length > 0) {
          // Fetch profiles for each user
          const userIds = data.map(item => item.user_id).filter(Boolean)
          
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .in('id', userIds)
            
            if (profilesError) {
              console.error('Error fetching profiles for leaderboard:', profilesError)
            }
            
            // Map profiles to points data
            if (profilesData) {
              const profilesMap = new Map(profilesData.map(p => [p.id, p]))
              data = data.map(item => ({
                ...item,
                profiles: profilesMap.get(item.user_id) || null
              }))
            }
          }
        }
        break

      case 'posts':
        // Count posts per user
        const { data: postsData } = await supabase
          .from('posts')
          .select('author_id')
        
        if (postsData) {
          const postCounts = {}
          postsData.forEach(post => {
            postCounts[post.author_id] = (postCounts[post.author_id] || 0) + 1
          })
          
          const sortedUsers = Object.entries(postCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([userId, count]) => ({
              user_id: userId,
              count
            }))
          
          // Fetch profiles
          const userIds = sortedUsers.map(item => item.user_id).filter(Boolean)
          
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .in('id', userIds)
            
            if (profilesError) {
              console.error('Error fetching profiles for leaderboard:', profilesError)
            }
            
            if (profilesData) {
              const profilesMap = new Map(profilesData.map(p => [p.id, p]))
              data = sortedUsers.map(item => ({
                ...item,
                profiles: profilesMap.get(item.user_id) || null
              }))
            } else {
              data = sortedUsers
            }
          } else {
            data = sortedUsers
          }
        }
        break

      case 'streak':
        const { data: streakData, error: streakError } = await supabase
          .from('user_streaks')
          .select('*')
          .eq('streak_type', 'daily')
          .order('current_streak', { ascending: false })
          .limit(limit)
        
        data = streakData
        error = streakError
        
        if (!error && data && data.length > 0) {
          // Fetch profiles for each user
          const userIds = data.map(item => item.user_id).filter(Boolean)
          
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .in('id', userIds)
            
            if (profilesError) {
              console.error('Error fetching profiles for leaderboard:', profilesError)
            }
            
            // Map profiles to streak data
            if (profilesData) {
              const profilesMap = new Map(profilesData.map(p => [p.id, p]))
              data = data.map(item => ({
                ...item,
                profiles: profilesMap.get(item.user_id) || null
              }))
            }
          }
        }
        break

      default:
        return []
    }

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getLeaderboard:', error)
    return []
  }
}

/**
 * Calculate progress percentage for next level
 * @param {Object} pointsData - User points data
 * @returns {number} Progress percentage (0-100)
 */
export function calculateLevelProgress(pointsData) {
  if (!pointsData) return 0

  const currentLevelPoints = (pointsData.level - 1) ** 2 * 100
  const nextLevelPoints = pointsData.level ** 2 * 100
  const progress = pointsData.total_points_earned - currentLevelPoints
  const needed = nextLevelPoints - currentLevelPoints

  return Math.min(100, Math.max(0, (progress / needed) * 100))
}
