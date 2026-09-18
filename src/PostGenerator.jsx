import React, { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { BadgeCheck, Download, Linkedin, Heart, Share2, Bookmark, MessageCircle, Palette, Copy, Check, ImagePlus, X, ClipboardPaste, Type } from 'lucide-react';
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
  const [images, setImages] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const postRef      = useRef(null);
  const editorRef    = useRef(null);
  const fileInputRef = useRef(null);

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

  // ── Add image ─────────────────────────────────────────────
  const addImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImages(prev => {
      if (prev.length >= 2) return prev;
      const reader = new FileReader();
      reader.onload = (e) => setImages(p => [...p, e.target.result].slice(0, 2));
      reader.readAsDataURL(file);
      return prev;
    });
  }, []);

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

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
  const handleFileInput = (e) => addImage(e.target.files[0]);
  const handleDrop      = (e) => { e.preventDefault(); setDragging(false); addImage(e.dataTransfer.files[0]); };

  // ── Export: html2canvas ignores object-fit, so swap each .post-img
  //    with a canvas that manually applies cover before capture ────────
  const captureCanvas = async () => {
    if (!postRef.current) return null;
    const H2C_SCALE = 6;
    const imgSwaps = [];
    let canvas = null;
    try {
      for (const imgEl of postRef.current.querySelectorAll('.post-img')) {
        const w = imgEl.offsetWidth || imgEl.clientWidth || 400;
        const h = imgEl.offsetHeight || imgEl.clientHeight || 400;
        if (!w || !h) continue;
        const natW = imgEl.naturalWidth || w;
        const natH = imgEl.naturalHeight || h;
        const cw = w * H2C_SCALE, ch = h * H2C_SCALE;
        const cvs = document.createElement('canvas');
        cvs.width = cw; cvs.height = ch;
        cvs.style.cssText = `width:${w}px;height:${h}px;display:block;`;
        const ctx = cvs.getContext('2d');
        // cover: scale to fill, center-crop (matches CSS object-fit:cover)
        const scale = Math.max(cw / natW, ch / natH);
        const dw = natW * scale, dh = natH * scale;
        ctx.drawImage(imgEl, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        if (imgEl.parentElement) {
          imgEl.parentElement.replaceChild(cvs, imgEl);
          imgSwaps.push({ cvs, imgEl });
        }
      }
      canvas = await html2canvas(postRef.current, {
        scale: 6, backgroundColor: null, useCORS: true, logging: false, allowTaint: true,
      });
    } finally {
      for (const { cvs, imgEl } of imgSwaps)
        if (cvs.parentElement) cvs.parentElement.replaceChild(imgEl, cvs);
    }
    return canvas;
  };

  // Opens the rendered image in a new tab so the user can long-press → Save
  const openImageTab = (dataUrl) => {
    const w = window.open('about:blank', '_blank');
    if (!w) return;
    w.document.write(
      '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body style="margin:0;background:#111;display:flex;flex-direction:column;align-items:center;">' +
      '<img src="' + dataUrl + '" style="max-width:100%;display:block;"/>' +
      '<p style="font-family:sans-serif;color:#aaa;padding:14px;text-align:center;font-size:14px;">' +
      'Long-press the image → Save to Photos / Downloads</p>' +
      '</body></html>'
    );
    w.document.close();
  };

  const handleDownload = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      openImageTab(dataUrl);
    } else {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `vamsi-post-${theme}.png`;
      link.click();
    }
  };

  const handleCopy = async () => {
    const canvas = await captureCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // iOS: navigator.share fails after async ops (loses user-gesture context);
    // open in tab so user can long-press save — most reliable iOS approach.
    if (isIOS) { openImageTab(dataUrl); return; }

    canvas.toBlob(async (blob) => {
      try {
        // Android / desktop — try native share first
        const file = new File([blob], `vamsi-post-${theme}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Vamsi Penmetsa Post' });
          setCopied(true); setTimeout(() => setCopied(false), 2000); return;
        }
        // Desktop clipboard
        if (navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true); setTimeout(() => setCopied(false), 2000); return;
        }
        // Final fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `vamsi-post-${theme}.png`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Copy failed:', err);
        openImageTab(dataUrl);
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
                  {pasteFlash ? '✓ Image pasted!' : images.length === 1 ? 'Side by side, same height' : 'PNG · JPG · GIF · WEBP · paste from clipboard'}
                </span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />
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
            <button onClick={handleCopy} className="copy-btn">
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? 'Saved!' : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Save Image' : /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Share' : 'Copy Image'}
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
