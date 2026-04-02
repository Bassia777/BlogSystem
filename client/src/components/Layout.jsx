import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout({ children, onLogout, role }) {
  const location = useLocation();
  const isSuper = role === 'superadmin';

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-container">
          <h1 className="navbar-title">我的博客</h1>
          <div className="navbar-links">
            <Link
              to="/posts"
              className={`nav-link ${location.pathname === '/posts' ? 'active' : ''}`}
            >
              随笔
            </Link>
            <Link
              to="/articles"
              className={`nav-link ${location.pathname === '/articles' ? 'active' : ''}`}
            >
              博文
            </Link>
            {isSuper && (
              <Link
                to="/users"
                className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
              >
                用户管理
              </Link>
            )}
            <button type="button" onClick={onLogout} className="logout-button">
              退出登录
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default Layout;
