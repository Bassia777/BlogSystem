import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout({ children, onLogout, role }) {
  const location = useLocation();
  const isSuper = role === 'superadmin';
  const isGuest = role === 'guest';

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
            <Link
              to="/gallery"
              className={`nav-link ${location.pathname === '/gallery' ? 'active' : ''}`}
            >
              图片长廊
            </Link>
            <Link
              to="/files"
              className={`nav-link ${location.pathname === '/files' ? 'active' : ''}`}
            >
              文件管理
            </Link>
            {isSuper && !isGuest && (
              <>
                <Link
                  to="/users"
                  className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
                >
                  用户管理
                </Link>
                <Link
                  to="/page-config"
                  className={`nav-link ${location.pathname === '/page-config' ? 'active' : ''}`}
                >
                  页面配置
                </Link>
              </>
            )}
            <button type="button" onClick={onLogout} className="logout-button">
              {isGuest ? '退出游客模式' : '退出登录'}
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default Layout;
