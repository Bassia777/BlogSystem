import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const CREDENTIAL_RE = /^[a-zA-Z0-9]{1,8}$/;

function sanitizeCredential(input) {
  return input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
}

function Login({ onLogin }) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!CREDENTIAL_RE.test(account)) {
      setError('账号须为字母或数字，1～8位');
      return;
    }
    if (!CREDENTIAL_RE.test(password)) {
      setError('密码须为字母或数字，1～8位');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { account, password });
      if (response.data.success) {
        const { token, account: acc, role } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('account', acc);
        localStorage.setItem('role', role);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        onLogin({ account: acc, role });
      }
    } catch (err) {
      setError(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">个人博客系统</h1>
        <p className="login-subtitle">请输入账号与密码（字母或数字，各不超过8位）</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder="账号"
              value={account}
              onChange={(e) => setAccount(sanitizeCredential(e.target.value))}
              disabled={loading}
              autoComplete="username"
              maxLength={8}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              className="form-input"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(sanitizeCredential(e.target.value))}
              disabled={loading}
              autoComplete="current-password"
              maxLength={8}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '登录中...' : '进入博客'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
