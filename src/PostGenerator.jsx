import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { BadgeCheck, Image as ImageIcon, Download } from 'lucide-react';
import './PostGenerator.css';

const PostGenerator = () => {
  const [text, setText] = useState('This is a sample post text. Type in the box above to update this preview!');
  const postRef = useRef(null);

  const handleDownload = async () => {
    if (postRef.current) {
      const canvas = await html2canvas(postRef.current, {
        scale: 2, // Higher scale for better quality
        backgroundColor: null, // Transparent background if needed, or white
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
            <div className="avatar-placeholder">
              <ImageIcon size={24} color="#666" />
            </div>
            <div className="user-info">
              <div className="name-row">
                <span className="name">Vamsi Penmetsa</span>
                <BadgeCheck size={18} className="blue-tick" fill="#1DA1F2" color="white" />
              </div>
              <span className="username">@vamsipenmetsa</span>
            </div>
          </div>
          <div className="post-content">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostGenerator;
