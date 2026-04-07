import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Layout from './components/Layout';
import Posts from './components/Posts';
import Articles from './components/Articles';
import UserManagement from './components/UserManagement';
import Gallery from './components/Gallery';
import PageConfig from './components/PageConfig';
import './App.css';

function App() {
  const [auth, setAuth] = useState({
    token: null,
    account: null,
    role: null
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const account = localStorage.getItem('account');
    const role = localStorage.getItem('role');
    if (token && account) {
      if (role !== 'guest') {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      setAuth({ token, account, role });
    }
  }, []);

  const handleLogin = (payload) => {
    setAuth({
      token: localStorage.getItem('token'),
      account: payload.account,
      role: payload.role
    });
  };

  const handleLogout = async () => {
    if (auth.role !== 'guest') {
      try {
        await axios.post('/api/auth/logout');
      } catch {
        /* ignore */
      }
      delete axios.defaults.headers.common.Authorization;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('account');
    localStorage.removeItem('role');
    setAuth({ token: null, account: null, role: null });
  };

  if (!auth.token) {
    return <Login onLogin={handleLogin} />;
  }

  const isGuest = auth.role === 'guest';

  return (
    <Router>
      <Layout onLogout={handleLogout} role={auth.role}>
        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/posts" element={<Posts isGuest={isGuest} />} />
          <Route path="/articles" element={<Articles isGuest={isGuest} />} />
          <Route path="/gallery" element={<Gallery isGuest={isGuest} />} />
          <Route
            path="/users"
            element={
              auth.role === 'superadmin' ? (
                <UserManagement />
              ) : (
                <Navigate to="/posts" replace />
              )
            }
          />
          <Route
            path="/page-config"
            element={
              auth.role === 'superadmin' ? (
                <PageConfig />
              ) : (
                <Navigate to="/posts" replace />
              )
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
