import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { BadgeCheck, Download, Linkedin, Heart, Share2, Bookmark, MessageCircle, Palette, Copy, Check, ImagePlus, X, ClipboardPaste } from 'lucide-react';
import './PostGenerator.css';

const PostGenerator = () => {
  const [text, setText] = useState('This is a sample post text. Type in the box above to update this preview!');
  const [theme, setTheme] = useState('dim');
  const [copied, setCopied] = useState(false);
  const [images, setImages] = useState([]);          // max 2 images
  const [dragging, setDragging] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const postRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Add image (file → base64) ──────────────────────────────
  const addImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImages(prev => {
      if (prev.length >= 2) return prev;          // max 2
      const reader = new FileReader();
      reader.onload = (e) =>
        setImages(p => [...p, e.target.result].slice(0, 2));
      reader.readAsDataURL(file);
      return prev;                                // no-op until reader fires
    });
  }, []);

  const removeImage = (idx) =>
    setImages(prev => prev.filter((_, i) => i !== idx));

  // ── Global paste handler (Twitter/X clipboard screenshots) ──
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            addImage(file);
            setPasteFlash(true);
            setTimeout(() => setPasteFlash(false), 1200);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImage]);

  // ── File input / drag-drop ─────────────────────────────────
  const handleFileInput  = (e) => addImage(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addImage(e.dataTransfer.files[0]);
  };

  // ── Export ─────────────────────────────────────────────────
  const captureCanvas = async () => {
    if (!postRef.current) return null;
    return html2canvas(postRef.current, {
      scale: 6,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });
  };

  const handleDownload = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    link.download = `vamsi-post-${theme}.png`;
    link.click();
  };

  const handleCopy = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (navigator.share && (isMobile || !navigator.clipboard?.write)) {
          const file = new File([blob], `vamsi-post-${theme}.png`, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Vamsi Penmetsa Post' });
            setCopied(true); setTimeout(() => setCopied(false), 2000);
            return;
          }
        }
        if (navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true); setTimeout(() => setCopied(false), 2000);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `vamsi-post-${theme}.png`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Copy failed:', err);
        alert('Downloaded instead (clipboard not supported on this device)');
      }
    }, 'image/png', 1.0);
  };

  // ── Themes ─────────────────────────────────────────────────
  const themes = [
    { id: 'light',    name: 'Light',    bg: '#ffffff',  fg: '#000000' },
    { id: 'warm',     name: 'Warm',     bg: '#fdf0e0',  fg: '#3d2b1f' },
    { id: 'dim',      name: 'Dim Blue', bg: '#192734',  fg: '#ffffff' },
    { id: 'dark',     name: 'Dark',     bg: '#000000',  fg: '#ffffff' },
    { id: 'blue',     name: 'Blue',     bg: '#0a66c2',  fg: '#ffffff' },
    { id: 'midnight', name: 'Midnight', bg: '#0d1117',  fg: '#e6edf3' },
    { id: 'ocean',    name: 'Ocean',    bg: '#0c2d48',  fg: '#e8f4fd' },
    { id: 'purple',   name: 'Purple',   bg: '#2d1b69',  fg: '#e9d5ff' },
  ];

  const canAddMore = images.length < 2;

  return (
    <div className="container">
      <div className="input-section">
        <h1>Post Generator</h1>
        <p className="subtitle">Create a premium LinkedIn-style post card instantly.</p>

        <div className="controls">
          {/* Text */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind?"
            className="text-input"
            rows="4"
          />

          {/* Image section */}
          <div className="image-section">
            <span className="label">
              <ImagePlus size={16} />
              Images
              <span className="label-hint">
                — up to 2, side-by-side · <ClipboardPaste size={12} style={{display:'inline',verticalAlign:'middle'}} /> Ctrl+V to paste
              </span>
            </span>

            {/* Existing image thumbnails */}
            {images.length > 0 && (
              <div className="image-thumbs">
                {images.map((img, i) => (
                  <div key={i} className="thumb-wrap">
                    <img src={img} alt={`Image ${i+1}`} className="image-preview-thumb" />
                    <button className="remove-image-btn" onClick={() => removeImage(i)} title="Remove">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload zone — hidden when 2 images loaded */}
            {canAddMore && (
              <div
                className={`drop-zone ${dragging ? 'dragging' : ''} ${pasteFlash ? 'paste-flash' : ''}`}
                onClick={() => fileInputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <ImagePlus size={24} className="drop-icon" />
                <span>{images.length === 1 ? 'Add 2nd image' : 'Click, drag & drop, or Ctrl+V'}</span>
                <span className="drop-hint">
                  {pasteFlash
                    ? '✓ Image pasted!'
                    : images.length === 1
                      ? 'Side by side, same height'
                      : 'PNG · JPG · GIF · WEBP · paste from clipboard'}
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {/* Theme selector */}
          <div className="theme-selector">
            <span className="label"><Palette size={16} /> Theme</span>
            <div className="theme-options">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                  style={{ background: t.bg, color: t.fg, border: theme === t.id ? '2px solid #1DA1F2' : '1px solid #e1e8ed' }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="action-buttons">
            <button onClick={handleCopy} className="copy-btn">
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? 'Copied!' : (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Share' : 'Copy Image')}
            </button>
            <button onClick={handleDownload} className="download-btn">
              <Download size={20} />
              Download PNG
            </button>
          </div>
        </div>
      </div>

      {/* Card preview */}
      <div className="preview-section">
        <div className={`post-card ${theme}`} ref={postRef}>

          {/* Header */}
          <div className="post-header">
            <img
              src={`${import.meta.env.BASE_URL}vamsipenmetsa.jpg`}
              alt="Vamsi Penmetsa"
              className="avatar"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=Vamsi+Penmetsa&background=random'; }}
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

          {/* Text */}
          <div className="post-content">{text}</div>

          {/* Images: 1 = full-bleed, 2 = side-by-side same height */}
          {images.length > 0 && (
            <div className={`post-images-grid ${images.length === 2 ? 'dual' : 'single'}`}>
              {images.map((img, i) => (
                <img key={i} src={img} alt={`Attached ${i + 1}`} className="post-img" />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="post-footer">
            <div className="interaction-item"><Heart   size={20} className="icon" /><span>Like</span></div>
            <div className="interaction-item"><MessageCircle size={20} className="icon" /><span>Comment</span></div>
            <div className="interaction-item"><Share2  size={20} className="icon" /><span>Share</span></div>
            <div className="interaction-item"><Bookmark size={20} className="icon" /><span>Save</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostGenerator;
