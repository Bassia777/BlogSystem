import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

// 开发环境直连 API（127.0.0.1:3001），不走 Vite 代理，避免 Windows 上 ENOBUFS / 端口与前端冲突
if (import.meta.env.DEV) {
  axios.defaults.baseURL = 'http://127.0.0.1:3001'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
