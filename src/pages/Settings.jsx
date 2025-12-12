import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Settings.css'

function Settings({ user }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/auth')
      return
    }
    loadUserData()
  }, [user, navigate])

  const loadUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setName(currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '')
        setEmail(currentUser.email || '')
      }

      // Load profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        // PGRST116 = no rows returned (profile doesn't exist yet)
        // 406 = table doesn't exist or RLS issue
        if (profileError.code !== 'PGRST116' && profileError.code !== '42P01') {
          console.error('Error loading profile:', profileError)
        }
        // If profile doesn't exist, we'll create it when user saves
      } else if (profile) {
        setBio(profile.bio || '')
        setAvatarUrl(profile.avatar_url || '')
        setAvatarPreview(profile.avatar_url || '')
        setLocation(profile.location || '')
        setWebsite(profile.website || '')
        setTwitterUrl(profile.twitter_url || '')
        if (profile.name) setName(profile.name)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // Validate file size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
      setMessage('Image size must be less than 1MB')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload file
    await uploadAvatar(file)
  }

  const uploadAvatar = async (file) => {
    setUploading(true)
    setMessage('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Delete old avatar if exists
      if (avatarUrl && avatarUrl.includes('supabase.co/storage/v1/object/public/images/')) {
        const oldPath = avatarUrl.split('/images/')[1]
        await supabase.storage.from('images').remove([oldPath])
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      setAvatarPreview(publicUrl)
      setMessage('Avatar uploaded successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      setMessage('Failed to upload avatar. Please try again.')
      setAvatarPreview(avatarUrl) // Revert to old preview
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      if (avatarUrl && avatarUrl.includes('supabase.co/storage/v1/object/public/images/')) {
        const filePath = avatarUrl.split('/images/')[1]
        await supabase.storage.from('images').remove([filePath])
      }
      setAvatarUrl('')
      setAvatarPreview('')
      setMessage('Avatar removed successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error removing avatar:', error)
      setMessage('Failed to remove avatar.')
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: name.trim()
        }
      })

      if (authError) throw authError

      // Upsert profile data
      const profileData = {
        id: user.id,
        name: name.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        updated_at: new Date().toISOString()
      }


      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        })

      if (profileError) throw profileError

      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const newPassword = e.target.newPassword.value
    const confirmPassword = e.target.confirmPassword.value

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match')
      setSaving(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters')
      setSaving(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage('Password updated successfully!')
      e.target.reset()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating password:', error)
      setMessage('Failed to update password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="settings">
      <div className="settings-container">
        <h1 className="settings-title">Settings</h1>

        <div className="settings-section">
          <h2 className="section-title">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="settings-form">
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="settings-input"
                placeholder="Your name"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="settings-input disabled"
              />
              <p className="form-help">Email cannot be changed</p>
            </div>

            <div className="form-group">
              <label htmlFor="avatar">Profile Picture</label>
              <div className="avatar-upload-container">
                <div className="avatar-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="avatar-preview-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      {name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="avatar-upload-controls">
                  <input
                    ref={fileInputRef}
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="avatar-file-input"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="avatar-upload-btn"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : avatarPreview ? 'Change Avatar' : 'Upload Avatar'}
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="avatar-remove-btn"
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="form-help">Max file size: 1MB. Supported formats: JPG, PNG, GIF, WebP</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="settings-textarea"
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
              />
              <p className="form-help">{bio.length}/500 characters</p>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="settings-input"
                placeholder="City, Country"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="settings-input"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="twitterUrl">Twitter/X URL</label>
              <input
                id="twitterUrl"
                type="url"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                className="settings-input"
                placeholder="https://twitter.com/username"
              />
            </div>

            {message && !message.includes('Password') && (
              <div className={`settings-message ${message.includes('success') || message.includes('uploaded') || message.includes('removed') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className="settings-btn"
              disabled={saving || uploading}
            >
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h2 className="section-title">Change Password</h2>
          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                className="settings-input"
                placeholder="Enter new password"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="settings-input"
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>

            {message && message.includes('Password') && (
              <div className={`settings-message ${message.includes('success') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className="settings-btn"
              disabled={saving}
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings
