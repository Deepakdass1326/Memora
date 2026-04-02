import './SaveItemModal.scss';
import React, { useState, useEffect } from 'react';
import { useItems } from '../../context/ItemsContext';
import api from '../../services/api';

const TYPES = [
  { value:'article', label:'Article', icon:'ri-article-line' },
  { value:'video',   label:'Video',   icon:'ri-play-circle-line' },
  { value:'tweet',   label:'Tweet',   icon:'ri-twitter-x-line' },
  { value:'image',   label:'Image',   icon:'ri-image-line' },
  { value:'pdf',     label:'PDF',     icon:'ri-file-pdf-line' },
  { value:'note',    label:'Note',    icon:'ri-sticky-note-line' },
  { value:'link',    label:'Link',    icon:'ri-link' },
];

export default function SaveItemModal({ onClose }) {
  const { createItem } = useItems();
  const [form, setForm] = useState({ title:'', url:'', description:'', type:'article', tags:'', content:'' });
  const [collections, setCollections] = useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/collections').then(r => setCollections(r.data.data)).catch(() => {});
    if (navigator.clipboard?.readText) {
      navigator.clipboard.readText().then(text => { if (text.startsWith('http')) setForm(f => ({ ...f, url: text })); }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setLoading(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await createItem({ ...form, tags, collections: selectedCols });
      if (result?.suggestedTags) setSuggestedTags(result.suggestedTags);
      onClose();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addTag = (tag) => {
    const existing = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!existing.includes(tag)) setForm(f => ({ ...f, tags: [...existing, tag].join(', ') }));
  };

  const toggleCol = (id) => setSelectedCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-scale">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-logo">
            <div className="mark">◈</div>
            <span>Save to Memora</span>
          </div>
          <button className="modal-close" onClick={onClose}><i className="ri-close-line" /></button>
        </div>

        {/* Type selector */}
        <div className="modal-type-row">
          {TYPES.map(t => (
            <button key={t.value} type="button" className={`type-btn ${form.type === t.value ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, type: t.value }))}>
              <i className={t.icon} style={{ fontSize: 13 }} />{t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label className="modal-label">Title *</label>
              <input className="modal-input" placeholder="What is this about?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
            </div>
            <div>
              <label className="modal-label">URL</label>
              <input className="modal-input" type="url" placeholder="https://…" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div>
              <label className="modal-label">Notes</label>
              <textarea className="modal-input modal-input--ta" placeholder="Brief notes or summary…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <label className="modal-label">Tags</label>
              <input className="modal-input" placeholder="ai, design, research (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              {suggestedTags.length > 0 && (
                <div className="suggested-tags" style={{ marginTop: 8 }}>
                  <span className="label">✦ AI suggested:</span>
                  {suggestedTags.map(t => <button key={t} type="button" className="tag-pill" onClick={() => addTag(t)} style={{ cursor: 'pointer' }}>+ {t}</button>)}
                </div>
              )}
            </div>
            {collections.length > 0 && (
              <div>
                <label className="modal-label">Collection</label>
                <div className="collection-chips">
                  {collections.map(col => (
                    <button key={col._id} type="button" className={`collection-chip ${selectedCols.includes(col._id) ? 'active' : ''}`} onClick={() => toggleCol(col._id)}>
                      <span>{col.emoji}</span><span>{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !form.title}>
              {loading ? <><i className="ri-loader-4-line spin" />Saving…</> : <><i className="ri-bookmark-line" />Save to Memora</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
