import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Notes from './pages/Notes'
import Note from './pages/Note'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'
import EditPost from './pages/EditPost'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Auth from './pages/Auth'
import NotFound from './pages/NotFound'
import './App.css'

function AppContent({ user }) {
  const location = useLocation()
  const hideFooter = location.pathname === '/create' || location.pathname.startsWith('/edit/')

  return (
    <div className="app">
      <Navbar user={user} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notes" element={<Notes user={user} />} />
          <Route path="/note/:slug" element={<Note user={user} />} />
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/create" element={<CreatePost user={user} />} />
          <Route path="/edit/:slug" element={<EditPost user={user} />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route path="/profile/:slug" element={<Profile user={user} />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}

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
        <AppContent user={user} />
      </Router>
    </ThemeProvider>
  )
}

export default App

