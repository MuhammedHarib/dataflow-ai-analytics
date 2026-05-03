import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './index.css'
import './index.light-theme-override.css'  // ← add this line

// react-grid-layout drag/resize styles
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'


ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)