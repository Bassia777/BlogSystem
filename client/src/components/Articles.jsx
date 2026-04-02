import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Articles.css';

function Articles() {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await axios.get('/api/articles');
      setArticles(response.data);
    } catch (error) {
      console.error('获取文章失败:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      return;
    }

    if (content.length > 2000) {
      setError('文章内容不能超过2000字');
      return;
    }

    try {
      await axios.post('/api/articles', { title, content });
      setTitle('');
      setContent('');
      setShowForm(false);
      fetchArticles();
    } catch (error) {
      setError(error.response?.data?.message || '发布失败');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const wordCount = content.length;

  return (
    <div className="articles-container">
      <div className="articles-header">
        <h2 className="section-title">博文</h2>
        <button
          className="new-article-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '取消' : '写新文章'}
        </button>
      </div>

      {showForm && (
        <div className="article-form-card">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="article-title-input"
              placeholder="文章标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="word-count">
              <span className={wordCount > 2000 ? 'error' : ''}>
                {wordCount} / 2000 字
              </span>
            </div>
            <textarea
              className="article-content-textarea"
              placeholder="在这里写下你的长篇大论..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="15"
            />
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="submit-button">发布文章</button>
          </form>
        </div>
      )}

      {selectedArticle ? (
        <div className="article-detail">
          <button
            className="back-button"
            onClick={() => setSelectedArticle(null)}
          >
            ← 返回列表
          </button>
          <div className="article-detail-card">
            <h1 className="article-detail-title">{selectedArticle.title}</h1>
            <div className="article-detail-meta">
              <span>{formatDate(selectedArticle.created_at)}</span>
              <span>{selectedArticle.content.length} 字</span>
            </div>
            <div className="article-detail-content">
              {selectedArticle.content}
            </div>
          </div>
        </div>
      ) : (
        <div className="articles-list">
          {articles.length === 0 ? (
            <div className="empty-state">还没有文章，开始写第一篇吧！</div>
          ) : (
            articles.map(article => (
              <div
                key={article.id}
                className="article-card"
                onClick={() => setSelectedArticle(article)}
              >
                <h3 className="article-card-title">{article.title}</h3>
                <div className="article-card-meta">
                  <span>{formatDate(article.created_at)}</span>
                  <span>{article.content.length} 字</span>
                </div>
                <div className="article-card-preview">
                  {article.content.substring(0, 150)}...
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Articles;
