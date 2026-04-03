import './Library.scss';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import ItemCard from '../components/dashboard/ItemCard';
import { useItems } from '../context/ItemsContext';
import api from '../services/api';

const TYPES = ['article','video','tweet','image','pdf','note','link'];
const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function Library() {
  const { items, fetchItems, loading } = useItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [view, setView] = useState('grid');
  const [workspaceNotes, setWorkspaceNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const activeType = searchParams.get('type') || '';
  const activeTag  = searchParams.get('tag')  || '';

  useEffect(() => {
    if (activeType === 'note') {
      // Fetch workspace notes instead of item-type notes
      setNotesLoading(true);
      api.get('/notes').then(r => setWorkspaceNotes(r.data.data)).catch(() => {}).finally(() => setNotesLoading(false));
    } else {
      fetchItems({ type: activeType || undefined, tag: activeTag || undefined });
    }
  }, [activeType, activeTag]);

  useEffect(() => {
    api.get('/tags').then(r => setTags(r.data.data.slice(0, 20))).catch(() => {});
  }, []);

  const setFilter = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (p.get(key) === val) p.delete(key); else { p.delete('type'); p.delete('tag'); p.set(key, val); }
    setSearchParams(p);
  };

  const PAGE_TITLES = { article:'Articles', video:'Videos', tweet:'Tweets', image:'Images', pdf:'PDFs', note:'Notes', link:'Links' };
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

        {/* Notes view — show workspace notes */}
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
                <div
                  key={note._id}
                  onClick={() => navigate(`/workspace/${note.workspace?._id || note.workspace}`)}
                  className="item-card animate-fade"
                >
                  <div className="card-body" style={{ padding: '16px 16px 12px' }}>
                    <div className="card-body__meta">
                      <span className="card-body__source">
                        <i className="ri-layout-grid-line" style={{ marginRight: 4 }} />
                        {note.workspace?.name || 'Workspace'}
                      </span>
                    </div>
                    <h3 className="card-body__title" style={{ marginTop: 6, fontSize: '1rem' }}>
                      {note.title || 'Untitled Note'}
                    </h3>
                    {note.content && (
                      <p className="card-body__desc" style={{ marginTop: 6, WebkitLineClamp: 3 }}>
                        {note.content.replace(/<[^>]*>?/gm, '')}
                      </p>
                    )}
                  </div>
                  <div className="card-footer">
                    <span className="card-footer__time">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Normal items view */
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
            <div className="empty-state">
              <div className="icon"><i className="ri-inbox-archive-line" /></div>
              <h3>{activeType || activeTag ? 'No items match this filter' : 'Your library is empty'}</h3>
              <p>{activeType || activeTag ? 'Try a different filter or clear all.' : 'Click "Save" to add your first article, video, or link.'}</p>
            </div>
          ) : (
            <div className={view === 'grid' ? 'items-grid' : ''} style={view === 'list' ? { display: 'flex', flexDirection: 'column', gap: 10 } : {}}>
              {items.map(item => <ItemCard key={item._id} item={item} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
