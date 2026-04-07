import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PageConfig.css';

function PageConfig() {
  const [carouselImages, setCarouselImages] = useState(['', '', '']);
  const [uploading, setUploading] = useState([false, false, false]);
  const [previewImages, setPreviewImages] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCarouselConfig();
  }, []);

  const fetchCarouselConfig = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/settings/carousel?t=${Date.now()}`);
      console.log('获取轮播图配置:', response.data);
      if (response.data.images && response.data.images.length > 0) {
        const images = [...response.data.images];
        while (images.length < 3) {
          images.push('');
        }
        const imagesSlice = images.slice(0, 3);
        // 添加时间戳避免缓存
        const previewsWithTimestamp = imagesSlice.map(url => 
          url ? `${url}?t=${Date.now()}` : ''
        );
        setCarouselImages(imagesSlice);
        setPreviewImages(previewsWithTimestamp);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('只支持 PNG、JPG、JPEG、GIF、WEBP 格式的图片');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过10MB');
      return;
    }

    const newUploading = [...uploading];
    newUploading[index] = true;
    setUploading(newUploading);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('position', index);

    try {
      const response = await axios.post('/api/settings/carousel/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('上传成功，返回URL:', response.data.url);
      
      const newImages = [...carouselImages];
      const newPreviews = [...previewImages];
      
      // 添加时间戳避免缓存
      const urlWithTimestamp = `${response.data.url}?t=${Date.now()}`;
      newImages[index] = response.data.url;
      newPreviews[index] = urlWithTimestamp;
      
      setCarouselImages(newImages);
      setPreviewImages(newPreviews);
      
      setMessage('图片上传成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert(error.response?.data?.message || '上传失败');
      console.error('上传失败:', error);
    } finally {
      const newUploading = [...uploading];
      newUploading[index] = false;
      setUploading(newUploading);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    const validImages = carouselImages.filter(img => img);
    if (validImages.length === 0) {
      alert('请至少上传一张轮播图');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/settings/carousel', {
        images: carouselImages.filter(img => img)
      });
      setMessage('保存成功！登录页轮播图已更新');
      setTimeout(() => setMessage(''), 3000);
      
      // 清除登录页的缓存，强制下次重新获取
      localStorage.removeItem('carousel_config');
      localStorage.removeItem('carousel_config_time');
      
      // 重新获取配置以刷新预览
      await fetchCarouselConfig();
    } catch (error) {
      alert(error.response?.data?.message || '保存失败');
      console.error('保存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (index) => {
    if (!window.confirm('确定要删除这张图片吗？')) {
      return;
    }
    
    const newImages = [...carouselImages];
    const newPreviews = [...previewImages];
    newImages[index] = '';
    newPreviews[index] = '';
    setCarouselImages(newImages);
    setPreviewImages(newPreviews);
  };

  return (
    <div className="page-config-container">
      <div className="config-header">
        <h2 className="config-title">页面配置</h2>
        <p className="config-subtitle">配置登录页轮播图（建议尺寸：1364×767px）</p>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      <div className="carousel-config-section">
        <h3 className="section-title">轮播图配置</h3>
        <div className="carousel-grid">
          {[0, 1, 2].map((index) => (
            <div key={index} className="carousel-item-config">
              <div className="carousel-item-header">
                <h4>轮播图 {index + 1}</h4>
                {previewImages[index] && (
                  <button
                    className="delete-image-button"
                    onClick={() => handleDelete(index)}
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="image-upload-area">
                {previewImages[index] ? (
                  <div className="image-preview">
                    <img 
                      src={previewImages[index]} 
                      alt={`预览 ${index + 1}`}
                      onError={(e) => {
                        console.error(`图片加载失败: ${previewImages[index]}`);
                        console.error('完整错误:', e);
                      }}
                      onLoad={() => {
                        console.log(`图片加载成功: ${previewImages[index]}`);
                      }}
                    />
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>点击上传图片</p>
                  </div>
                )}
                <label className="upload-button-overlay">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={(e) => handleFileChange(index, e)}
                    disabled={uploading[index]}
                    style={{ display: 'none' }}
                  />
                  <span className="upload-text">
                    {uploading[index] ? '上传中...' : previewImages[index] ? '更换图片' : '选择图片'}
                  </span>
                </label>
              </div>
              <p className="image-hint">支持 PNG、JPG、GIF、WEBP，最大10MB</p>
            </div>
          ))}
        </div>
      </div>

      <div className="config-actions">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={loading || uploading.some(u => u)}
        >
          {loading ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
}

export default PageConfig;
