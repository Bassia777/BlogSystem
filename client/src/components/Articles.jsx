import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Articles.css';

function Articles({ isGuest }) {
  const [articles, setArticles] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [currentRole, setCurrentRole] = useState('');
  const [currentAccount, setCurrentAccount] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    const account = localStorage.getItem('account');
    setCurrentRole(role);
    setCurrentAccount(account);
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
      if (editingId) {
        await axios.put(`/api/articles/${editingId}`, { title, content });
        setEditingId(null);
      } else {
        await axios.post('/api/articles', { title, content });
      }
      setTitle('');
      setContent('');
      setShowForm(false);
      fetchArticles();
    } catch (error) {
      setError(error.response?.data?.message || '操作失败');
    }
  };

  const handleEdit = (article) => {
    setEditingId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setShowForm(true);
    setSelectedArticle(null);
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm('确定要删除这篇文章吗？删除后无法恢复！')) {
      return;
    }

    try {
      await axios.delete(`/api/articles/${articleId}`);
      alert('删除成功');
      fetchArticles();
      if (selectedArticle?.id === articleId) {
        setSelectedArticle(null);
      }
    } catch (error) {
      alert(error.response?.data?.message || '删除失败');
      console.error('删除失败:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setShowForm(false);
    setError('');
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

  const canEditOrDelete = (article) => {
    if (isGuest) return false;
    return currentRole === 'superadmin' || currentAccount === article.author;
  };

  return (
    <div className="articles-container">
      <div className="articles-header">
        <h2 className="section-title">博文</h2>
        {!isGuest && (
          <button
            className="new-article-button"
            onClick={() => {
              if (showForm && !editingId) {
                setShowForm(false);
              } else if (showForm && editingId) {
                handleCancelEdit();
              } else {
                setShowForm(true);
              }
            }}
          >
            {showForm ? '取消' : '写新文章'}
          </button>
        )}
      </div>

      {showForm && !isGuest && (
        <div className="article-form-card">
          <h3>{editingId ? '编辑文章' : '新建文章'}</h3>
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
            <div className="form-actions">
              <button type="submit" className="submit-button">
                {editingId ? '保存修改' : '发布文章'}
              </button>
              {editingId && (
                <button type="button" className="cancel-button" onClick={handleCancelEdit}>
                  取消编辑
                </button>
              )}
            </div>
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
            <div className="article-detail-header">
              <div>
                <h1 className="article-detail-title">{selectedArticle.title}</h1>
                <div className="article-detail-meta">
                  <span>作者: {selectedArticle.author || '匿名'}</span>
                  <span>{formatDate(selectedArticle.created_at)}</span>
                  <span>{selectedArticle.content.length} 字</span>
                </div>
              </div>
              {canEditOrDelete(selectedArticle) && (
                <div className="article-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(selectedArticle)}
                  >
                    编辑
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(selectedArticle.id)}
                  >
                    删除
                  </button>
                </div>
              )}
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
              >
                <div className="article-card-header">
                  <h3 
                    className="article-card-title"
                    onClick={() => setSelectedArticle(article)}
                    style={{ cursor: 'pointer' }}
                  >
                    {article.title}
                  </h3>
                  {canEditOrDelete(article) && (
                    <div className="article-card-actions">
                      <button
                        className="edit-button-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(article);
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="delete-button-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(article.id);
                        }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
                <div className="article-card-meta">
                  <span>作者: {article.author || '匿名'}</span>
                  <span>{formatDate(article.created_at)}</span>
                  <span>{article.content.length} 字</span>
                </div>
                <div 
                  className="article-card-preview"
                  onClick={() => setSelectedArticle(article)}
                >
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
