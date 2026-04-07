import React, { useState, useEffect } from 'react';
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
  const [carouselImages, setCarouselImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchCarouselImages();
  }, []);

  useEffect(() => {
    if (carouselImages.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [carouselImages.length]);

  const fetchCarouselImages = async () => {
    try {
      const response = await axios.get(`/api/settings/carousel?t=${Date.now()}`);
      console.log('登录页获取轮播图:', response.data);
      if (response.data.images && response.data.images.length > 0) {
        // 给每个图片URL添加时间戳避免缓存
        const imagesWithTimestamp = response.data.images.map(url => 
          `${url}?t=${Date.now()}`
        );
        setCarouselImages(imagesWithTimestamp);
      } else {
        setCarouselImages([
          `/team-bg.png?t=${Date.now()}`,
          `/p2.png?t=${Date.now()}`,
          `/p3.png?t=${Date.now()}`
        ]);
      }
    } catch (error) {
      console.error('获取轮播图失败:', error);
      setCarouselImages([
        `/team-bg.png?t=${Date.now()}`,
        `/p2.png?t=${Date.now()}`,
        `/p3.png?t=${Date.now()}`
      ]);
    }
  };

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

  const handleGuestLogin = () => {
    localStorage.setItem('token', 'guest');
    localStorage.setItem('account', 'guest');
    localStorage.setItem('role', 'guest');
    onLogin({ account: 'guest', role: 'guest' });
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="carousel-container">
          {carouselImages.map((image, index) => (
            <div
              key={index}
              className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <img 
                src={image} 
                alt={`轮播图 ${index + 1}`} 
                className="login-bg-image"
                onError={(e) => {
                  console.error(`图片加载失败: ${image}`);
                  e.target.style.display = 'none';
                }}
                onLoad={() => {
                  console.log(`图片加载成功: ${image}`);
                }}
              />
            </div>
          ))}
          
          {/* 左右切换按钮 */}
          {carouselImages.length > 1 && (
            <>
              <button 
                className="carousel-arrow carousel-arrow-left"
                onClick={() => {
                  setCurrentSlide((prev) => 
                    prev === 0 ? carouselImages.length - 1 : prev - 1
                  );
                }}
                aria-label="上一张"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <button 
                className="carousel-arrow carousel-arrow-right"
                onClick={() => {
                  setCurrentSlide((prev) => 
                    prev === carouselImages.length - 1 ? 0 : prev + 1
                  );
                }}
                aria-label="下一张"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </>
          )}
        </div>
        <div className="carousel-dots">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`切换到第 ${index + 1} 张图片`}
            />
          ))}
        </div>
      </div>
      <div className="login-right">
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
          <div className="guest-divider">
            <span>或</span>
          </div>
          <button 
            type="button" 
            className="guest-button" 
            onClick={handleGuestLogin}
            disabled={loading}
          >
            游客模式
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
