import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { BadgeCheck, Download, Linkedin, Heart, Share2, Bookmark, MessageCircle } from 'lucide-react';
import './PostGenerator.css';

const PostGenerator = () => {
  const [text, setText] = useState('This is a sample post text. Type in the box above to update this preview!');
  const postRef = useRef(null);

  const handleDownload = async () => {
    if (postRef.current) {
      const canvas = await html2canvas(postRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'vamsi-post.png';
      link.click();
    }
  };

  return (
    <div className="container">
      <div className="input-section">
        <h1>Post Generator</h1>
        <p className="subtitle">Create a premium post wireframe instantly.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="text-input"
          rows="4"
        />
        <button onClick={handleDownload} className="download-btn">
          <Download size={20} />
          Download PNG
        </button>
      </div>

      <div className="preview-section">
        <div className="post-card" ref={postRef}>
          <div className="post-header">
            <img src="/VamsiPenmetsa.jpg" alt="Vamsi Penmetsa" className="avatar" />
            <div className="user-info">
              <div className="name-row">
                <span className="name">Vamsi Penmetsa</span>
                <BadgeCheck size={18} className="blue-tick" fill="#0a66c2" color="white" />
                <span className="dot">•</span>
                <span className="follow-text">Following</span>
              </div>
              <div className="handle-row">
                <span className="username">@vamsipenmetsa</span>
                <Linkedin size={14} className="linkedin-icon" color="#0a66c2" />
              </div>
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
