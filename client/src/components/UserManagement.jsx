import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserManagement.css';

const CREDENTIAL_RE = /^[a-zA-Z0-9]{1,8}$/;

function sanitizeCredential(input) {
  return input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  const load = async () => {
    setError('');
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data);
    } catch (e) {
      setError(e.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!CREDENTIAL_RE.test(newAccount) || !CREDENTIAL_RE.test(newPassword)) {
      setError('新用户账号与密码须为字母或数字，1～8位');
      return;
    }
    try {
      await axios.post('/api/users', {
        account: newAccount,
        password: newPassword
      });
      setNewAccount('');
      setNewPassword('');
      load();
    } catch (e) {
      setError(e.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id, account) => {
    if (!window.confirm(`确定删除用户「${account}」？`)) return;
    setError('');
    try {
      await axios.delete(`/api/users/${id}`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || '删除失败');
    }
  };

  const submitReset = async (id) => {
    setError('');
    if (!CREDENTIAL_RE.test(resetPassword)) {
      setError('新密码须为字母或数字，1～8位');
      return;
    }
    try {
      await axios.patch(`/api/users/${id}/password`, { password: resetPassword });
      setResetId(null);
      setResetPassword('');
      load();
    } catch (e) {
      setError(e.response?.data?.message || '修改失败');
    }
  };

  if (loading) {
    return <div className="um-loading">加载中...</div>;
  }

  return (
    <div className="um-container">
      <h2 className="um-title">用户管理</h2>
      <p className="um-desc">可查看已注册用户的账号与密码；超管 root 不可删除。</p>

      {error && <div className="um-error">{error}</div>}

      <div className="um-card">
        <h3 className="um-section-title">新增用户</h3>
        <form className="um-form" onSubmit={handleCreate}>
          <input
            type="text"
            className="um-input"
            placeholder="账号（字母数字，≤8位）"
            value={newAccount}
            onChange={(e) => setNewAccount(sanitizeCredential(e.target.value))}
            maxLength={8}
          />
          <input
            type="text"
            className="um-input"
            placeholder="密码（字母数字，≤8位）"
            value={newPassword}
            onChange={(e) => setNewPassword(sanitizeCredential(e.target.value))}
            maxLength={8}
          />
          <button type="submit" className="um-btn primary">
            注册
          </button>
        </form>
      </div>

      <div className="um-card">
        <h3 className="um-section-title">用户列表</h3>
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>账号</th>
                <th>密码</th>
                <th>角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.account}</td>
                  <td className="um-mono">{u.password || '—'}</td>
                  <td>{u.role === 'superadmin' ? '超管' : '用户'}</td>
                  <td className="um-actions">
                    {u.account !== 'root' && (
                      <>
                        <button
                          type="button"
                          className="um-btn small"
                          onClick={() => {
                            setResetId(resetId === u.id ? null : u.id);
                            setResetPassword('');
                          }}
                        >
                          改密
                        </button>
                        <button
                          type="button"
                          className="um-btn small danger"
                          onClick={() => handleDelete(u.id, u.account)}
                        >
                          删除
                        </button>
                      </>
                    )}
                    {u.account === 'root' && (
                      <span className="um-muted">内置超管</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {resetId != null && (
          <div className="um-reset-panel">
            <span>用户 ID {resetId} 新密码：</span>
            <input
              type="text"
              className="um-input inline"
              value={resetPassword}
              onChange={(e) => setResetPassword(sanitizeCredential(e.target.value))}
              maxLength={8}
              placeholder="新密码"
            />
            <button
              type="button"
              className="um-btn primary small"
              onClick={() => submitReset(resetId)}
            >
              保存
            </button>
            <button
              type="button"
              className="um-btn small"
              onClick={() => {
                setResetId(null);
                setResetPassword('');
              }}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
