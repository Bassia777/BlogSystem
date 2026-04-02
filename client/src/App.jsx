import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Layout from './components/Layout';
import Posts from './components/Posts';
import Articles from './components/Articles';
import UserManagement from './components/UserManagement';
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
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
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
    try {
      await axios.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    delete axios.defaults.headers.common.Authorization;
    localStorage.removeItem('token');
    localStorage.removeItem('account');
    localStorage.removeItem('role');
    setAuth({ token: null, account: null, role: null });
  };

  if (!auth.token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout onLogout={handleLogout} role={auth.role}>
        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/articles" element={<Articles />} />
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
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
