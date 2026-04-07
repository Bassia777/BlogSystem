import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Gallery.css';

function Gallery({ isGuest }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [currentRole, setCurrentRole] = useState('');

  useEffect(() => {
    const account = localStorage.getItem('account');
    const role = localStorage.getItem('role');
    setCurrentUser(account);
    setCurrentRole(role);
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/gallery');
      setImages(response.data.images || []);
    } catch (error) {
      console.error('获取图片失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('只支持 PNG、JPG、JPEG、GIF、WEBP 格式的图片');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      await axios.post('/api/gallery', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('上传成功');
      fetchImages();
      e.target.value = '';
    } catch (error) {
      alert(error.response?.data?.message || '上传失败');
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId, imageAuthor) => {
    if (currentRole !== 'superadmin' && currentUser !== imageAuthor) {
      alert('只有超管和上传者本人可以删除图片');
      return;
    }

    if (!window.confirm('确定要删除这张图片吗？')) {
      return;
    }

    try {
      await axios.delete(`/api/gallery/${imageId}`);
      alert('删除成功');
      fetchImages();
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
    <div className="gallery-container">
      <div className="gallery-header">
        <h2 className="gallery-title">图片长廊</h2>
        {!isGuest && (
          <div className="upload-section">
            <label className="upload-button">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              {uploading ? '上传中...' : '上传图片'}
            </label>
            <p className="upload-hint">支持 PNG、JPG、GIF、WEBP 格式，最大5MB</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : images.length === 0 ? (
        <div className="empty-state">
          <p>还没有图片，快来上传第一张吧！</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {images.map((image) => (
            <div key={image.id} className="gallery-item">
              <div className="image-wrapper">
                <img
                  src={image.url}
                  alt={`图片 ${image.id}`}
                  className="gallery-image"
                  loading="lazy"
                />
              </div>
              <div className="image-info">
                <div className="image-meta">
                  <span className="image-author">上传者: {image.author}</span>
                  <span className="image-time">{formatDate(image.created_at)}</span>
                </div>
                {!isGuest && (currentRole === 'superadmin' || currentUser === image.author) && (
                  <button
                    className="image-delete-button"
                    onClick={() => handleDelete(image.id, image.author)}
                    title="删除图片"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Gallery;
