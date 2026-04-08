import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Files.css';

function Files({ isGuest }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const currentRole = localStorage.getItem('role');
  const isSuper = currentRole === 'superadmin';

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/api/files');
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过50MB');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setMessage('文件上传成功！');
      setTimeout(() => setMessage(''), 3000);
      
      await fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || '上传失败');
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('确定要删除这个文件吗？')) {
      return;
    }

    try {
      await axios.delete(`/api/files/${fileId}`);
      setMessage('文件删除成功！');
      setTimeout(() => setMessage(''), 3000);
      await fetchFiles();
    } catch (error) {
      alert(error.response?.data?.message || '删除失败');
      console.error('删除失败:', error);
    }
  };

  const handlePreview = (file) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (mimetype) => {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📽️';
    if (mimetype.includes('text')) return '📃';
    if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('7z')) return '📦';
    return '📎';
  };

  const renderPreview = (file) => {
    const { mimetype, url, originalName } = file;

    // PDF 直接预览
    if (mimetype === 'application/pdf') {
      return (
        <iframe
          src={url}
          title={originalName}
          className="file-preview-iframe"
        />
      );
    }

    // 图片直接预览
    if (mimetype.startsWith('image/')) {
      return (
        <div className="file-preview-image-container">
          <img src={url} alt={originalName} className="file-preview-image" />
        </div>
      );
    }

    // Office 文件：仅显示文件信息，不支持预览和下载
    if (mimetype.includes('word') || mimetype.includes('excel') || mimetype.includes('powerpoint') ||
        mimetype.includes('document') || mimetype.includes('spreadsheet') || mimetype.includes('presentation')) {
      
      return (
        <div className="file-preview-not-supported">
          <p className="preview-tip-title">📄 {originalName}</p>
          <p className="preview-tip-desc">
            Office文档暂不支持在线预览
          </p>
          <div className="file-info-box">
            <div className="file-info-row">
              <span className="file-info-label">文件名称：</span>
              <span className="file-info-value">{originalName}</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">文件大小：</span>
              <span className="file-info-value">{formatFileSize(file.size)}</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">上传时间：</span>
              <span className="file-info-value">{new Date(file.uploadedAt).toLocaleString()}</span>
            </div>
            <div className="file-info-row">
              <span className="file-info-label">上传者：</span>
              <span className="file-info-value">{file.uploader}</span>
            </div>
          </div>
        </div>
      );
    }

    // 文本文件预览（包括Markdown）
    if (mimetype.startsWith('text/') || originalName.endsWith('.md') || originalName.endsWith('.markdown')) {
      return (
        <div className="file-preview-text">
          <iframe src={url} title={originalName} className="file-preview-iframe" />
        </div>
      );
    }

    // 其他文件类型显示提示
    return (
      <div className="file-preview-not-supported">
        <p>此文件类型暂不支持在线预览</p>
        <p className="file-info">
          <span>{getFileIcon(mimetype)} {originalName}</span>
          <span>类型：{mimetype}</span>
          <span>大小：{formatFileSize(file.size)}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="files-container">
      <div className="files-header">
        <h2>文件管理</h2>
        {isSuper && !isGuest && (
          <div className="files-upload-section">
            <label className="upload-button">
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg,.zip,.rar,.7z,.json,.xml"
              />
              {uploading ? '上传中...' : '📁 上传文件'}
            </label>
            <p className="upload-hint">
              支持：PDF、Word、Excel、PPT、图片、文本等，最大50MB
            </p>
          </div>
        )}
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      <div className="files-grid">
        {files.length === 0 ? (
          <div className="empty-state">
            <p>暂无文件</p>
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="file-card">
              <div className="file-icon-large">
                {getFileIcon(file.mimetype)}
              </div>
              <div className="file-info-section">
                <h3 className="file-name" title={file.originalName}>
                  {file.originalName}
                </h3>
                <p className="file-meta">
                  <span>{formatFileSize(file.size)}</span>
                  <span>·</span>
                  <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                </p>
                <p className="file-uploader">上传者：{file.uploader}</p>
              </div>
              <div className="file-actions">
                <button
                  className="preview-button"
                  onClick={() => handlePreview(file)}
                >
                  👁️ 预览
                </button>
                {isSuper && !isGuest && (
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(file.id)}
                  >
                    🗑️ 删除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showPreview && previewFile && (
        <div className="preview-modal" onClick={closePreview}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewFile.originalName}</h3>
              <button className="close-button" onClick={closePreview}>
                ✕
              </button>
            </div>
            <div className="preview-body">
              {renderPreview(previewFile)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Files;
