import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Posts.css';

function Posts() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [replyContent, setReplyContent] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState('');

  useEffect(() => {
    // 获取当前用户角色
    const role = localStorage.getItem('role');
    setCurrentRole(role);
    fetchPosts();
  }, [currentPage]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/posts?page=${currentPage}`);
      setPosts(response.data.posts);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('获取动态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      await axios.post('/api/posts', { content: newPost });
      setNewPost('');
      setCurrentPage(1);
      fetchPosts();
    } catch (error) {
      console.error('发布动态失败:', error);
    }
  };

  const handleReplySubmit = async (postId) => {
    const content = replyContent[postId];
    if (!content?.trim()) return;

    try {
      await axios.post(`/api/posts/${postId}/replies`, { content });
      setReplyContent({ ...replyContent, [postId]: '' });
      fetchPosts();
    } catch (error) {
      console.error('回复失败:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('确定要删除这条帖子吗？删除后无法恢复！')) {
      return;
    }

    try {
      await axios.delete(`/api/posts/${postId}`);
      alert('删除成功');
      fetchPosts();
    } catch (error) {
      alert(error.response?.data?.message || '删除失败');
      console.error('删除失败:', error);
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

  return (
    <div className="posts-container">
      <div className="post-form-card">
        <h2 className="section-title">发布随笔</h2>
        <form onSubmit={handlePostSubmit}>
          <textarea
            className="post-textarea"
            placeholder="分享你的想法..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows="4"
          />
          <button type="submit" className="submit-button">发布</button>
        </form>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="posts-list">
          {posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <div>
                  <span className="post-author">作者: {post.author || '匿名'}</span>
                  <span className="post-time">{formatDate(post.created_at)}</span>
                </div>
                {currentRole === 'superadmin' && (
                  <button 
                    className="delete-button" 
                    onClick={() => handleDeletePost(post.id)}
                    title="删除帖子"
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="post-content">{post.content}</div>

              {post.replies && post.replies.length > 0 && (
                <div className="replies-section">
                  <div className="replies-title">回复 ({post.replies.length})</div>
                  {post.replies.map(reply => (
                    <div key={reply.id} className="reply-item">
                      <div className="reply-time">{formatDate(reply.created_at)}</div>
                      <div className="reply-content">{reply.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="reply-form">
                <input
                  type="text"
                  className="reply-input"
                  placeholder="写下你的回复..."
                  value={replyContent[post.id] || ''}
                  onChange={(e) => setReplyContent({ ...replyContent, [post.id]: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleReplySubmit(post.id);
                    }
                  }}
                />
                <button
                  className="reply-button"
                  onClick={() => handleReplySubmit(post.id)}
                >
                  回复
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-button"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </button>
          <span className="page-info">
            第 {currentPage} 页 / 共 {totalPages} 页
          </span>
          <button
            className="page-button"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default Posts;
