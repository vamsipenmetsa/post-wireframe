import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { BadgeCheck, Download, Linkedin, Heart, Share2, Bookmark, MessageCircle, Palette, Copy, Check, ImagePlus, X, ClipboardPaste, Type, Film } from 'lucide-react';
import './PostGenerator.css';

const FONTS = [
  { id: 'inter',         name: 'Inter',        css: "'Inter', sans-serif" },
  { id: 'space-grotesk', name: 'Space Grotesk', css: "'Space Grotesk', sans-serif" },
  { id: 'plus-jakarta',  name: 'Jakarta',       css: "'Plus Jakarta Sans', sans-serif" },
  { id: 'dm-sans',       name: 'DM Sans',       css: "'DM Sans', sans-serif" },
  { id: 'sora',          name: 'Sora',          css: "'Sora', sans-serif" },
  { id: 'outfit',        name: 'Outfit',        css: "'Outfit', sans-serif" },
  { id: 'manrope',       name: 'Manrope',       css: "'Manrope', sans-serif" },
];

const INITIAL_HTML = 'This is a sample post text. Type here and <strong>select text</strong> to style it!';

const PostGenerator = () => {
  const [theme, setTheme] = useState('dim');
  const [font, setFont] = useState('inter');
  const [richText, setRichText] = useState(INITIAL_HTML);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const postRef      = useRef(null);
  const editorRef    = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const videoRef     = useRef(null);

  // Initialize editor HTML once — do NOT use dangerouslySetInnerHTML on the editor
  // (that would reset cursor position on every keystroke)
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = INITIAL_HTML;
  }, []);

  const handleInput = useCallback(() => {
    setRichText(editorRef.current?.innerHTML || '');
  }, []);

  // ── Inline formatting ──────────────────────────────────────
  const applyFormat = useCallback((format) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();

    switch (format) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'bold-italic':
        document.execCommand('bold', false, null);
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'cursive':
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const selected = sel.toString();
          if (selected) {
            const safe = selected.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            document.execCommand('insertHTML', false,
              `<span style="font-family:'Dancing Script',cursive">${safe}</span>`
            );
          }
        }
        break;
      case 'clear':
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          document.execCommand('insertText', false, sel.toString());
        }
        break;
      default:
        break;
    }

    setRichText(editorRef.current.innerHTML);
  }, []);

  // ── Editor paste — images → attachment, text → plain ──────
  const handleEditorPaste = useCallback((e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) { addImage(file); setPasteFlash(true); setTimeout(() => setPasteFlash(false), 1200); }
        return;
      }
    }
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  }, []); // addImage added below via ref-stable pattern — safe since addImage is stable

  // ── Add image (clears video) ───────────────────────────────
  const addImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setVideo(null);
    setImages(prev => {
      if (prev.length >= 2) return prev;
      const reader = new FileReader();
      reader.onload = (e) => setImages(p => [...p, e.target.result].slice(0, 2));
      reader.readAsDataURL(file);
      return prev;
    });
  }, []);

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  // ── Add video (clears images) ──────────────────────────────
  const addVideo = useCallback((file) => {
    if (!file || !file.type.startsWith('video/')) return;
    setImages([]);
    const reader = new FileReader();
    reader.onload = (e) => setVideo(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  // ── Global paste — images only, skip when editor has focus ─
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target === editorRef.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { addImage(file); setPasteFlash(true); setTimeout(() => setPasteFlash(false), 1200); }
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImage]);

  // ── File input / drag-drop ─────────────────────────────────
  const handleFileInput  = (e) => addImage(e.target.files[0]);
  const handleDrop       = (e) => { e.preventDefault(); setDragging(false); addImage(e.dataTransfer.files[0]); };
  const handleVideoInput = (e) => addVideo(e.target.files[0]);
  const handleVideoDrop  = (e) => { e.preventDefault(); addVideo(e.dataTransfer.files[0]); };

  // ── Export (swaps video → frame img for html2canvas) ──────
  const captureCanvas = async () => {
    if (!postRef.current) return null;

    let videoImgEl = null, videoWrap = null, originalVideoEl = null;
    if (video && videoRef.current) {
      const vid = videoRef.current;
      const tmp = document.createElement('canvas');
      tmp.width = vid.videoWidth || vid.clientWidth;
      tmp.height = vid.videoHeight || vid.clientHeight;
      tmp.getContext('2d').drawImage(vid, 0, 0, tmp.width, tmp.height);
      videoWrap = vid.parentElement; originalVideoEl = vid;
      videoImgEl = document.createElement('img');
      videoImgEl.src = tmp.toDataURL('image/png');
      videoImgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      videoWrap.replaceChild(videoImgEl, vid);
    }

    const canvas = await html2canvas(postRef.current, {
      scale: 6, backgroundColor: null, useCORS: true, logging: false, allowTaint: true,
    });

    if (videoWrap && originalVideoEl && videoImgEl)
      videoWrap.replaceChild(originalVideoEl, videoImgEl);

    return canvas;
  };

  // ── Shared: record post card as video blob ─────────────────
  const recordCardVideo = async () => {
    const vid = videoRef.current;
    const card = postRef.current;
    if (!vid || !card) throw new Error('refs not ready');

    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const cardRect = card.getBoundingClientRect();
    const vidRect  = vid.parentElement.getBoundingClientRect();

    const W  = Math.round(cardRect.width  * scale);
    const H  = Math.round(cardRect.height * scale);
    const vx = Math.round((vidRect.left  - cardRect.left) * scale);
    const vy = Math.round((vidRect.top   - cardRect.top)  * scale);
    const vw = Math.round(vidRect.width  * scale);
    const vh = Math.round(vidRect.height * scale);

    vid.style.visibility = 'hidden';
    const overlayCanvas = await html2canvas(card, {
      scale, backgroundColor: null, useCORS: true, logging: false, allowTaint: true,
    });
    vid.style.visibility = '';
    overlayCanvas.getContext('2d').clearRect(vx, vy, vw, vh);
    const overlayBitmap = await createImageBitmap(overlayCanvas);

    const recCanvas = document.createElement('canvas');
    recCanvas.width = W; recCanvas.height = H;
    const ctx = recCanvas.getContext('2d');

    const mimeType = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';
    const stream   = recCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks   = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    const duration = (isFinite(vid.duration) && vid.duration > 0)
      ? Math.min(vid.duration * 1000, 30_000) : 5_000;

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(vid, vx, vy, vw, vh);
      ctx.drawImage(overlayBitmap, 0, 0);
      animId = requestAnimationFrame(draw);
    };

    vid.currentTime = 0;
    await vid.play().catch(() => {});
    recorder.start();
    draw();

    await new Promise(resolve => setTimeout(() => {
      cancelAnimationFrame(animId); recorder.stop(); vid.pause(); resolve();
    }, duration));

    await new Promise(resolve => { recorder.onstop = resolve; });
    vid.play().catch(() => {});

    const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
    return { blob: new Blob(chunks, { type: mimeType }), ext, mimeType };
  };

  const handleDownload = async () => {
    if (video) {
      setRecording(true);
      try {
        const { blob, ext } = await recordCardVideo();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `vamsi-post-${theme}.${ext}`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (err) {
        console.error('Video export failed:', err);
        alert('Video export failed — try Chrome or Edge.');
      } finally { setRecording(false); }
      return;
    }
    const canvas = await captureCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    link.download = `vamsi-post-${theme}.png`;
    link.click();
  };

  const handleCopy = async () => {
    if (video) {
      setRecording(true);
      try {
        const { blob, ext, mimeType } = await recordCardVideo();
        const file = new File([blob], `vamsi-post-${theme}.${ext}`, { type: mimeType });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Vamsi Penmetsa Post' });
          setCopied(true); setTimeout(() => setCopied(false), 2000);
        } else {
          // Share API unavailable — fall back to download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = file.name;
          document.body.appendChild(a); a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Video share failed:', err);
      } finally { setRecording(false); }
      return;
    }

    const canvas = await captureCanvas();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (navigator.share && (isMobile || !navigator.clipboard?.write)) {
          const file = new File([blob], `vamsi-post-${theme}.png`, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Vamsi Penmetsa Post' });
            setCopied(true); setTimeout(() => setCopied(false), 2000); return;
          }
        }
        if (navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true); setTimeout(() => setCopied(false), 2000); return;
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

  const selectedFont = FONTS.find(f => f.id === font)?.css;
  const canAddMore   = images.length < 2;

  const fmtBtn = (format, label, title) => (
    <button
      key={format}
      className={`format-btn${format === 'cursive' ? ' cursive-btn' : ''}${format === 'clear' ? ' clear-btn' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); applyFormat(format); }}
      title={title}
    >{label}</button>
  );

  return (
    <div className="container">
      <div className="input-section">
        <h1>Post Generator</h1>
        <p className="subtitle">Create a premium LinkedIn-style post card instantly.</p>

        <div className="controls">

          {/* Format toolbar + rich text editor */}
          <div className="editor-wrap">
            <div className="format-toolbar">
              {fmtBtn('bold',         <b>B</b>,              'Bold')}
              {fmtBtn('italic',       <em>I</em>,            'Italic')}
              {fmtBtn('bold-italic',  <b><em>BI</em></b>,    'Bold Italic')}
              {fmtBtn('cursive',      'Aa',                  'Cursive / Script')}
              {fmtBtn('underline',    <u>U</u>,              'Underline')}
              {fmtBtn('strikethrough',<s>S</s>,              'Strikethrough')}
              <div className="format-divider" />
              {fmtBtn('clear',        '✕',                   'Clear formatting')}
            </div>
            <div
              ref={editorRef}
              contentEditable
              className="text-input rich-editor"
              onInput={handleInput}
              onPaste={handleEditorPaste}
              data-placeholder="What's on your mind?"
              suppressContentEditableWarning
            />
          </div>

          {/* Image section */}
          <div className="image-section">
            <span className="label">
              <ImagePlus size={16} />
              Images
              <span className="label-hint">
                — up to 2, side-by-side · <ClipboardPaste size={12} style={{display:'inline',verticalAlign:'middle'}} /> Ctrl+V to paste
              </span>
            </span>
            {images.length > 0 && (
              <div className="image-thumbs">
                {images.map((img, i) => (
                  <div key={i} className="thumb-wrap">
                    <img src={img} alt={`Image ${i+1}`} className="image-preview-thumb" />
                    <button className="remove-image-btn" onClick={() => removeImage(i)} title="Remove"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            {canAddMore && !video && (
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
                  {pasteFlash ? '✓ Image pasted!' : images.length === 1 ? 'Side by side, same height' : 'PNG · JPG · GIF · WEBP · paste from clipboard'}
                </span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
          </div>

          {/* Video section */}
          <div className="image-section">
            <span className="label">
              <Film size={16} />
              Video
              <span className="label-hint">— MP4 · WebM · MOV (replaces images)</span>
            </span>
            {video ? (
              <div className="image-thumbs">
                <div className="thumb-wrap">
                  <video src={video} className="image-preview-thumb" muted />
                  <button className="remove-image-btn" onClick={() => setVideo(null)} title="Remove"><X size={13} /></button>
                </div>
              </div>
            ) : (
              <div className="drop-zone" onClick={() => videoInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={handleVideoDrop}>
                <Film size={24} className="drop-icon" />
                <span>Click or drag a video</span>
                <span className="drop-hint">{images.length > 0 ? 'Will clear existing images' : 'MP4 · WebM · MOV'}</span>
              </div>
            )}
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoInput} style={{ display: 'none' }} />
          </div>

          {/* Font selector */}
          <div className="font-selector">
            <span className="label"><Type size={16} /> Font</span>
            <div className="font-options">
              {FONTS.map((f) => (
                <button key={f.id} onClick={() => setFont(f.id)} className={`font-btn ${font === f.id ? 'active' : ''}`} style={{ fontFamily: f.css }}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Theme selector */}
          <div className="theme-selector">
            <span className="label"><Palette size={16} /> Theme</span>
            <div className="theme-options">
              {themes.map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)} className={`theme-btn ${theme === t.id ? 'active' : ''}`} style={{ background: t.bg, color: t.fg, border: theme === t.id ? '2px solid #1DA1F2' : '1px solid #e1e8ed' }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="action-buttons">
            <button onClick={handleCopy} className="copy-btn" disabled={recording}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {recording ? 'Recording…'
                : video   ? 'Share Video'
                : copied  ? 'Copied!'
                : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Share' : 'Copy Image'}
            </button>
            <button onClick={handleDownload} className="download-btn" disabled={recording}>
              <Download size={20} />
              {recording ? 'Recording…' : video ? 'Download Video' : 'Download PNG'}
            </button>
          </div>
        </div>
      </div>

      {/* Card preview */}
      <div className="preview-section">
        <div className={`post-card ${theme}`} ref={postRef}>

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

          {/* Rich text rendered as HTML */}
          <div
            className="post-content"
            style={{ fontFamily: selectedFont }}
            dangerouslySetInnerHTML={{ __html: richText }}
          />

          {/* Images */}
          {images.length > 0 && (
            <div className={`post-images-grid ${images.length === 2 ? 'dual' : 'single'}`}>
              {images.map((img, i) => (
                <img key={i} src={img} alt={`Attached ${i + 1}`} className="post-img" />
              ))}
            </div>
          )}

          {/* Video */}
          {video && (
            <div className="post-images-grid single">
              <video ref={videoRef} src={video} className="post-video" autoPlay muted loop playsInline />
            </div>
          )}

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
