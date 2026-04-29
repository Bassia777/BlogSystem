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
    // 优先从 localStorage 读取缓存的轮播图配置
    const cachedConfig = localStorage.getItem('carousel_config');
    const cachedTime = localStorage.getItem('carousel_config_time');
    const now = Date.now();
    
    // 如果缓存存在且未过期（24小时内），直接使用缓存
    if (cachedConfig && cachedTime && (now - parseInt(cachedTime)) < 24 * 60 * 60 * 1000) {
      try {
        const images = JSON.parse(cachedConfig);
        if (images && images.length > 0) {
          setCarouselImages(images);
          return; // 使用缓存，不发起请求
        }
      } catch (e) {
        console.error('解析缓存失败:', e);
      }
    }
    
    // 缓存不存在或已过期，从服务器获取
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
        const images = response.data.images;
        
        // 缓存配置到 localStorage（不带时间戳）
        localStorage.setItem('carousel_config', JSON.stringify(images));
        localStorage.setItem('carousel_config_time', Date.now().toString());
        
        // 给每个图片URL添加时间戳避免缓存
        const imagesWithTimestamp = images.map(url => 
          `${url}?t=${Date.now()}`
        );
        setCarouselImages(imagesWithTimestamp);
      } else {
        const defaultImages = [
          '/team-bg.png',
          '/p2.png',
          '/p3.png'
        ];
        localStorage.setItem('carousel_config', JSON.stringify(defaultImages));
        localStorage.setItem('carousel_config_time', Date.now().toString());
        setCarouselImages(defaultImages.map(url => `${url}?t=${Date.now()}`));
      }
    } catch (error) {
      console.error('获取轮播图失败:', error);
      // 失败时使用默认图片
      const defaultImages = [
        '/team-bg.png',
        '/p2.png',
        '/p3.png'
      ];
      setCarouselImages(defaultImages.map(url => `${url}?t=${Date.now()}`));
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
      // 后端返回 { token, account, role, message }，没有 success 字段
      if (response.data.token) {
        const { token, account: acc, role } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('account', acc);
        localStorage.setItem('role', role);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        onLogin({ account: acc, role });
      } else {
        setError('登录失败：服务器响应异常');
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
