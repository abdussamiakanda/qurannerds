import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Suppress findDOMNode warning from react-quill (known library issue)
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('findDOMNode is deprecated')
    ) {
      return
    }
    originalError.apply(console, args)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

