import './Library.scss';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import ItemCard from '../components/dashboard/ItemCard';
import { useItems } from '../context/ItemsContext';
import api from '../services/api';

const TYPES = ['article','video','tweet','image','pdf','note','link'];
const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function Library() {
  const { items, fetchItems, loading } = useItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState([]);
  const [view, setView] = useState('grid');
  const activeType = searchParams.get('type') || '';
  const activeTag  = searchParams.get('tag')  || '';

  useEffect(() => {
    fetchItems({ type: activeType || undefined, tag: activeTag || undefined });
  }, [activeType, activeTag]);

  useEffect(() => {
    api.get('/tags').then(r => setTags(r.data.data.slice(0, 20))).catch(() => {});
  }, []);

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (p.get(key) === val) p.delete(key); else { p.delete('type'); p.delete('tag'); p.set(key, val); }
    setSearchParams(p);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header title="Library" subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} saved`} />
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
          <div className="view-toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view"><i className="ri-layout-grid-2-line" /></button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view"><i className="ri-list-check-2" /></button>
          </div>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="tag-filter-bar">
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                className={`tag-pill ${activeTag === tag ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setFilter('tag', tag)}
              >
                {tag} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', marginLeft: 4, opacity: .7 }}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
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
          <div className="empty-state">
            <div className="icon"><i className="ri-inbox-archive-line" /></div>
            <h3>{activeType || activeTag ? 'No items match this filter' : 'Your library is empty'}</h3>
            <p>{activeType || activeTag ? 'Try a different filter or clear all.' : 'Click "Save" to add your first article, video, or link.'}</p>
          </div>
        ) : (
          <div className={view === 'grid' ? 'items-grid' : ''} style={view === 'list' ? { display: 'flex', flexDirection: 'column', gap: 10 } : {}}>
            {items.map(item => <ItemCard key={item._id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
