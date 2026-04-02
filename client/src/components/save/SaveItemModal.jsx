import React, { useState, useEffect, useRef } from 'react';
import { useItems } from '../../context/ItemsContext';
import api from '../../services/api';
import './SaveItemModal.css';

const TYPES = [
  { value: 'article', label: 'Article', icon: '📄' },
  { value: 'video', label: 'Video', icon: '▶️' },
  { value: 'tweet', label: 'Tweet', icon: '𝕏' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'pdf', label: 'PDF', icon: '📕' },
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'link', label: 'Link', icon: '🔗' },
];

export default function SaveItemModal({ onClose }) {
  const { createItem } = useItems();
  const [form, setForm] = useState({ title: '', url: '', description: '', type: 'article', tags: '', content: '' });
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = basic, 2 = details
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    api.get('/collections').then(r => setCollections(r.data.data)).catch(() => {});
    // Check clipboard for URL
    if (navigator.clipboard?.readText) {
      navigator.clipboard.readText().then(text => {
        if (text.startsWith('http')) setForm(f => ({ ...f, url: text }));
      }).catch(() => {});
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
      const result = await createItem({ ...form, tags, collections: selectedCollections });
      if (result.suggestedTags) setSuggestedTags(result.suggestedTags);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSuggestedTag = (tag) => {
    const existing = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!existing.includes(tag)) {
      setForm(f => ({ ...f, tags: [...existing, tag].join(', ') }));
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Save to Memora</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Selector */}
          <div className="type-selector">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`type-option ${form.type === t.value ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="modal-body">
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                placeholder="What is this about?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            {/* URL */}
            <div className="form-group">
              <label className="form-label">URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://..."
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Brief notes or summary..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input
                type="text"
                className="form-input"
                placeholder="ai, research, design (comma-separated)"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
              {suggestedTags.length > 0 && (
                <div className="suggested-tags">
                  <span className="suggested-label">✦ AI suggested:</span>
                  {suggestedTags.map(tag => (
                    <button key={tag} type="button" className="tag-pill" onClick={() => addSuggestedTag(tag)}>
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Collections */}
            {collections.length > 0 && (
              <div className="form-group">
                <label className="form-label">Add to Collection</label>
                <div className="collection-select">
                  {collections.map(col => (
                    <button
                      key={col._id}
                      type="button"
                      className={`collection-chip ${selectedCollections.includes(col._id) ? 'active' : ''}`}
                      onClick={() => setSelectedCollections(prev =>
                        prev.includes(col._id) ? prev.filter(c => c !== col._id) : [...prev, col._id]
                      )}
                    >
                      <span>{col.emoji}</span>
                      <span>{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !form.title}>
              {loading ? <span className="loading-dots">Saving</span> : '✦ Save to Memora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
