import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Post from './pages/Post'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'
import EditPost from './pages/EditPost'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import About from './pages/About'
import NotFound from './pages/NotFound'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes on auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="app">
          <Navbar user={user} />
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/post/:id" element={<Post user={user} />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/create" element={<CreatePost user={user} />} />
            <Route path="/edit/:id" element={<EditPost user={user} />} />
            <Route path="/settings" element={<Settings user={user} />} />
            <Route path="/profile/:userId" element={<Profile user={user} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App

