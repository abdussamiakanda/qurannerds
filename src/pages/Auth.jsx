import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Auth.css'

function Auth() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Handle email confirmation callback
    const handleAuthCallback = async () => {
      // Wait a moment for Supabase to process the token
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data, error } = await supabase.auth.getSession()
      
      if (data?.session) {
        const messageText = type === 'recovery' || queryType === 'recovery'
          ? 'Signed in successfully! Redirecting...'
          : 'Email confirmed! You are now signed in.'
        setMessage(messageText)
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
      } else if (error) {
        setMessage('Error signing in. Please try again.')
      }
    }

    // Check URL for auth callback (email confirmation)
    // Supabase uses hash fragments for PKCE flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')
    
    // Also check query parameters (some flows use these)
    const queryParams = new URLSearchParams(window.location.search)
    const queryToken = queryParams.get('access_token')
    const queryType = queryParams.get('type')
    
    // Handle both signup and magic link (recovery) callbacks
    if ((accessToken && (type === 'signup' || type === 'recovery')) || 
        (queryToken && (queryType === 'signup' || queryType === 'recovery'))) {
      handleAuthCallback()
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Check if user is already logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          navigate('/dashboard')
        }
      })
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        // Get the current site URL for redirect
        const siteUrl = window.location.origin
        const redirectTo = `${siteUrl}/auth`
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              name: name || email.split('@')[0]
            }
          }
        })

        if (error) throw error

        if (data.user) {
          setMessage('Account created! Please check your email to verify your account.')
          setTimeout(() => {
            navigate('/')
          }, 2000)
        }
      } else if (isForgotPassword) {
        // Send magic link for passwordless login
        const siteUrl = window.location.origin
        const redirectTo = `${siteUrl}/auth`
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo
          }
        })

        if (error) throw error

        setMessage('Check your email for a sign-in link. Click the link to sign in without a password.')
        setIsForgotPassword(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        navigate('/dashboard')
      }
    } catch (error) {
      setMessage(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">
            <span className="brand-quran">Quran</span>
            <span className="brand-nerds">Nerds</span>
          </h1>
          <p className="auth-subtitle">
            {isForgotPassword
              ? 'Enter your email to receive a sign-in link'
              : isSignUp 
              ? 'Create an account to start sharing your Quran study insights'
              : 'Sign in to continue your journey'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
          </div>

          {!isForgotPassword && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
                minLength={6}
              />
            </div>
          )}

          {message && (
            <div className={`auth-message ${message.includes('error') || message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || !email || (!isForgotPassword && !password)}
          >
            {loading 
              ? (isSignUp ? 'Creating Account...' : isForgotPassword ? 'Sending Link...' : 'Signing In...')
              : (isSignUp ? 'Create Account' : isForgotPassword ? 'Send Sign-In Link' : 'Sign In')
            }
          </button>
        </form>

        <div className="auth-footer">
          {!isForgotPassword && !isSignUp && (
            <p>
              <button
                onClick={() => {
                  setIsForgotPassword(true)
                  setMessage('')
                  setPassword('')
                }}
                className="auth-forgot-btn"
              >
                Forgot password?
              </button>
            </p>
          )}
          <p>
            {isForgotPassword 
              ? (
                <>
                  Remember your password?{' '}
                  <button
                    onClick={() => {
                      setIsForgotPassword(false)
                      setMessage('')
                    }}
                    className="auth-toggle-btn"
                  >
                    Sign In
                  </button>
                </>
              ) : isSignUp 
              ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setIsSignUp(false)
                      setMessage('')
                    }}
                    className="auth-toggle-btn"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setIsSignUp(true)
                      setMessage('')
                    }}
                    className="auth-toggle-btn"
                  >
                    Sign Up
                  </button>
                </>
              )
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth

