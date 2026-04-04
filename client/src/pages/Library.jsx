import './Library.scss';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import ItemCard from '../components/dashboard/ItemCard';
import { useItems } from '../context/ItemsContext';
import api from '../services/api';

const TYPES      = ['article','video','tweet','image','pdf','note','link','product'];
const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link', product:'ri-shopping-bag-line' };

// ── PDF Upload Modal ───────────────────────────────────────────────────────────
function PdfUploadModal({ onClose, onUploaded }) {
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState('');
  const [error, setError]         = useState('');
  const inputRef = useRef(null);

  const uploadPdf = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return; }
    if (file.size > 10 * 1024 * 1024)             { setError('PDF must be smaller than 10 MB.'); return; }
    setError(''); setUploading(true); setProgress('Uploading PDF…');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (!uploadRes.data.success) throw new Error(uploadRes.data.message);
      setProgress('Saving to library…');
      const itemRes = await api.post('/items', {
        title: file.name.replace(/\.pdf$/i, ''),
        url: uploadRes.data.url,
        type: 'pdf',
        thumbnail: uploadRes.data.thumbnail || '',
      });
      if (!itemRes.data.success) throw new Error(itemRes.data.message);
      onUploaded(itemRes.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Upload failed');
      setUploading(false);
    }
  }, [onUploaded, onClose]);

  const handleDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); uploadPdf(e.dataTransfer.files?.[0]); }, [uploadPdf]);
  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleFileInput = (e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); };

  // Close on backdrop click
  const handleBackdrop = (e) => { if (!uploading && e.target === e.currentTarget) onClose(); };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn .15s ease',
      }}
    >
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 20, width: 460, maxWidth: '92vw',
        boxShadow: 'var(--shadow-xl)',
        animation: 'scaleIn .2s cubic-bezier(.34,1.56,.64,1)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'color-mix(in srgb, var(--type-pdf) 12%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--type-pdf)', fontSize: 17,
            }}>
              <i className="ri-file-pdf-line" />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '.95rem', color: 'var(--foreground)' }}>Upload PDF</p>
              <p style={{ fontSize: '.72rem', color: 'var(--text-secondary)', marginTop: 1 }}>Max 10 MB · PDF only</p>
            </div>
          </div>
          {!uploading && (
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 7,
              border: '1px solid var(--border)', background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 16,
            }}>
              <i className="ri-close-line" />
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div style={{ padding: '20px 22px 22px' }}>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12,
              background: dragging
                ? 'color-mix(in srgb, var(--accent) 6%, transparent)'
                : 'var(--background)',
              padding: '36px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all .18s',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 13,
              background: 'color-mix(in srgb, var(--type-pdf) 10%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, color: 'var(--type-pdf)',
            }}>
              <i
                className={uploading ? 'ri-loader-2-line' : dragging ? 'ri-download-cloud-2-line' : 'ri-upload-cloud-2-line'}
                style={uploading ? { animation: 'spin 1s linear infinite' } : {}}
              />
            </div>

            {uploading ? (
              <>
                <p style={{ fontWeight: 600, color: 'var(--foreground)' }}>{progress}</p>
                <p style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>Please wait…</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, color: 'var(--foreground)' }}>
                  {dragging ? 'Drop it here!' : 'Drag & drop your PDF'}
                </p>
                <p style={{ fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                  or click anywhere in this box to browse
                </p>
              </>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 8,
              background: 'color-mix(in srgb, #EF4444 10%, transparent)',
              border: '1px solid color-mix(in srgb, #EF4444 30%, transparent)',
              color: '#EF4444', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ri-error-warning-line" /> {error}
            </div>
          )}

          {!uploading && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => inputRef.current?.click()}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <i className="ri-folder-open-line" /> Browse Files
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: 8,
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '.88rem',
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileInput} />
    </div>
  );
}

// ── Main Library page ──────────────────────────────────────────────────────────
export default function Library() {
  const { items, fetchItems, loading } = useItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tags, setTags]                     = useState([]);
  const [view, setView]                     = useState('grid');
  const [workspaceNotes, setWorkspaceNotes] = useState([]);
  const [notesLoading, setNotesLoading]     = useState(false);
  const [showPdfModal, setShowPdfModal]     = useState(false);
  const activeType = searchParams.get('type') || '';
  const activeTag  = searchParams.get('tag')  || '';

  useEffect(() => {
    if (activeType === 'note') {
      setNotesLoading(true);
      api.get('/notes').then(r => setWorkspaceNotes(r.data.data)).catch(() => {}).finally(() => setNotesLoading(false));
    } else {
      fetchItems({ type: activeType || undefined, tag: activeTag || undefined });
    }
  }, [activeType, activeTag]);

  useEffect(() => {
    const params = activeType && activeType !== 'note' ? `?type=${activeType}` : '';
    api.get(`/tags${params}`).then(r => setTags(r.data.data.slice(0, 20))).catch(() => {});
  }, [activeType]);

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (p.get(key) === val) p.delete(key); else { p.delete('type'); p.delete('tag'); p.set(key, val); }
    setSearchParams(p);
  };

  const handlePdfUploaded = useCallback(() => {
    fetchItems({ type: 'pdf' });
  }, [fetchItems]);

  const PAGE_TITLES = { article:'Articles', video:'Videos', tweet:'Tweets', image:'Images', pdf:'PDFs', note:'Notes', link:'Links', product:'Wishlist 🛒' };
  const pageTitle    = activeType ? PAGE_TITLES[activeType] : activeTag ? `#${activeTag}` : 'Library';
  const pageSubtitle = `${items.length} item${items.length !== 1 ? 's' : ''} saved`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header title={pageTitle} subtitle={pageSubtitle} />
      <div className="page-inner">

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="filters">
            <button className={`filter-btn ${!activeType && !activeTag ? 'active' : ''}`} onClick={() => setSearchParams({})}>All</button>
            {TYPES.map(t => (
              <button key={t} className={`filter-btn ${activeType === t ? 'active' : ''}`} onClick={() => setFilter('type', t)}>
                <i className={TYPE_ICONS[t]} style={{ fontSize: 13 }} />
                {t.charAt(0).toUpperCase() + t.slice(1)}s
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Upload PDF button — only visible on PDF tab */}
            {activeType === 'pdf' && (
              <button
                onClick={() => setShowPdfModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '.82rem', fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <i className="ri-upload-2-line" /> Upload PDF
              </button>
            )}
            <div className="view-toggle">
              <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view"><i className="ri-layout-grid-2-line" /></button>
              <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view"><i className="ri-list-check-2" /></button>
            </div>
          </div>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="tag-filter-bar">
            {tags.map(({ tag, count }) => (
              <button key={tag} className={`tag-pill ${activeTag === tag ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilter('tag', tag)}>
                {tag} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', marginLeft: 4, opacity: .7 }}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Notes view */}
        {activeType === 'note' ? (
          notesLoading ? (
            <div className="items-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', padding: 16 }}>
                  <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 18, width: '90%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 12, width: '80%' }} />
                </div>
              ))}
            </div>
          ) : workspaceNotes.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><i className="ri-sticky-note-line" /></div>
              <h3>No notes yet</h3>
              <p>Create notes inside a Workspace to see them here.</p>
            </div>
          ) : (
            <div className="items-grid">
              {workspaceNotes.map(note => (
                <div key={note._id} onClick={() => navigate(`/workspace/${note.workspace?._id || note.workspace}`)} className="item-card animate-fade">
                  <div className="card-body" style={{ padding: '16px 16px 12px' }}>
                    <div className="card-body__meta">
                      <span className="card-body__source"><i className="ri-layout-grid-line" style={{ marginRight: 4 }} />{note.workspace?.name || 'Workspace'}</span>
                    </div>
                    <h3 className="card-body__title" style={{ marginTop: 6, fontSize: '1rem' }}>{note.title || 'Untitled Note'}</h3>
                    {note.content && <p className="card-body__desc" style={{ marginTop: 6, WebkitLineClamp: 3 }}>{note.content.replace(/<[^>]*>?/gm, '')}</p>}
                  </div>
                  <div className="card-footer">
                    <span className="card-footer__time">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          loading ? (
            <div className="items-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="skeleton" style={{ height: 140 }} />
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 10, width: '40%' }} />
                    <div className="skeleton" style={{ height: 15, width: '80%' }} />
                    <div className="skeleton" style={{ height: 10, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            /* Empty state — PDF has special CTA */
            activeType === 'pdf' ? (
              <div className="empty-state">
                <div className="icon"><i className="ri-file-pdf-line" style={{ color: 'var(--type-pdf)' }} /></div>
                <h3>No PDFs yet</h3>
                <p>Upload your first PDF to start building your document library.</p>
                <button
                  onClick={() => setShowPdfModal(true)}
                  style={{
                    marginTop: 16, padding: '10px 24px', borderRadius: 9,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '.9rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <i className="ri-upload-2-line" /> Upload PDF
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon"><i className="ri-inbox-archive-line" /></div>
                <h3>{activeType || activeTag ? 'No items match this filter' : 'Your library is empty'}</h3>
                <p>{activeType || activeTag ? 'Try a different filter or clear all.' : 'Click "Save" to add your first article, video, or link.'}</p>
              </div>
            )
          ) : (
            <div className={view === 'grid' ? 'items-grid' : ''} style={view === 'list' ? { display: 'flex', flexDirection: 'column', gap: 10 } : {}}>
              {items.map(item => <ItemCard key={item._id} item={item} />)}
            </div>
          )
        )}
      </div>

      {/* PDF Upload Modal */}
      {showPdfModal && (
        <PdfUploadModal
          onClose={() => setShowPdfModal(false)}
          onUploaded={handlePdfUploaded}
        />
      )}
    </div>
  );
}
