import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { BadgeCheck, Download, Linkedin, Heart, Share2, Bookmark, MessageCircle, Palette } from 'lucide-react';
import './PostGenerator.css';

const PostGenerator = () => {
  const [text, setText] = useState('This is a sample post text. Type in the box above to update this preview!');
  const [theme, setTheme] = useState('light');
  const postRef = useRef(null);

  const handleDownload = async () => {
    if (postRef.current) {
      const canvas = await html2canvas(postRef.current, {
        scale: 6, // Ultra high resolution
        backgroundColor: null,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `vamsi-post-${theme}.png`;
      link.click();
    }
  };

  const themes = [
    { id: 'light', name: 'Light', color: '#ffffff', textColor: '#000000' },
    { id: 'dim', name: 'Dim', color: '#192734', textColor: '#ffffff' },
    { id: 'dark', name: 'Dark', color: '#000000', textColor: '#ffffff' },
  ];

  return (
    <div className="container">
      <div className="input-section">
        <h1>Post Generator</h1>
        <p className="subtitle">Create a premium post wireframe instantly.</p>

        <div className="controls">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="text-input"
            rows="4"
          />

          <div className="theme-selector">
            <span className="label"><Palette size={16} /> Theme</span>
            <div className="theme-options">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                  style={{ background: t.color, color: t.textColor, border: theme === t.id ? '2px solid #1DA1F2' : '1px solid #e1e8ed' }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleDownload} className="download-btn">
            <Download size={20} />
            Download PNG
          </button>
        </div>
      </div>

      <div className="preview-section">
        <div className={`post-card ${theme}`} ref={postRef}>
          <div className="post-header">
            <img
              src={`${import.meta.env.BASE_URL}vamsipenmetsa.jpg`}
              alt="Vamsi Penmetsa"
              className="avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://ui-avatars.com/api/?name=Vamsi+Penmetsa&background=random';
              }}
            />
            <div className="user-info">
              <div className="name-row">
                <span className="name">Vamsi Penmetsa</span>
                <BadgeCheck size={18} className="blue-tick" fill="#0a66c2" color="white" />
                <span className="dot">•</span>
                <span className="follow-text">Following</span>
              </div>
              <div className="handle-row">
                <span className="username">@vamsipenmetsa</span>
              </div>
            </div>
            <div className="linkedin-badge">
              <Linkedin size={20} fill="#0a66c2" color="white" />
            </div>
          </div>
          <div className="post-content">
            {text}
          </div>
          <div className="post-footer">
            <div className="interaction-item">
              <Heart size={20} className="icon" />
              <span>Like</span>
            </div>
            <div className="interaction-item">
              <MessageCircle size={20} className="icon" />
              <span>Comment</span>
            </div>
            <div className="interaction-item">
              <Share2 size={20} className="icon" />
              <span>Share</span>
            </div>
            <div className="interaction-item">
              <Bookmark size={20} className="icon" />
              <span>Save</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostGenerator;
