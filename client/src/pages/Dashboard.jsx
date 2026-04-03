import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import ItemCard from '../components/dashboard/ItemCard';
import { useItems } from '../context/ItemsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatRelative } from '../utils/helpers';
import './Dashboard.scss';

const TYPE_ICONS = { article: 'ri-article-line', video: 'ri-play-circle-line', tweet: 'ri-twitter-x-line', image: 'ri-image-line', pdf: 'ri-file-pdf-line', note: 'ri-sticky-note-line' };
const STAT_TYPES = ['article', 'video', 'tweet', 'image', 'pdf', 'note'];

export default function Dashboard() {
  const { user } = useAuth();
  const { items, fetchItems, loading } = useItems();
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({});
  const [recentNotes, setRecentNotes] = useState([]);

  useEffect(() => {
    fetchItems({ limit: 8 });
    api.get('/tags').then(r => setTags(r.data.data.slice(0, 14))).catch(() => { });
    api.get('/notes').then(r => setRecentNotes(r.data.data.slice(0, 4))).catch(() => { });
  }, []);

  const handleDeleteNote = async (e, noteId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await api.delete(`/notes/${noteId}`);
        setRecentNotes(prev => prev.filter(n => n._id !== noteId));
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  };

  useEffect(() => {
    if (items.length) {
      const counts = {};
      items.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
      setStats(counts);
    }
  }, [items]);

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? 'Good morning' :
      hour >= 12 && hour < 17 ? 'Good afternoon' :
        hour >= 17 && hour < 21 ? 'Good evening' : 'Good night';
  const greetingEmoji =
    hour >= 5 && hour < 12 ? '🌤️' :
      hour >= 12 && hour < 17 ? '☀️' :
        hour >= 17 && hour < 21 ? '🌆' : '🌙';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div className="page-inner">

        {/* Hero */}
        <div className="dashboard-hero">
          <div>
            <p className="dashboard-hero__greeting">{greeting} {greetingEmoji}</p>
            <h1 className="dashboard-hero__name">
              {user?.name?.split(' ')[0]}<span className="accent">.</span>
            </h1>
            <p className="dashboard-hero__sub">
              You have <strong>{user?.stats?.totalItems || items.length}</strong> things saved. Your second brain is growing.
            </p>
          </div>
          <div className="dashboard-hero__stats">
            {STAT_TYPES.filter(t => stats[t]).map(type => (
              <div key={type} className={`stat-chip stat-chip--${type}`}>
                <div className="stat-chip__icon">
                  <i className={TYPE_ICONS[type]} />
                </div>
                <div className="stat-chip__info">
                  <span className="stat-chip__num">{stats[type]}</span>
                  <span className="stat-chip__label">{type}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Saved */}
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <div>
              <h2 className="section-header__title">Recently Saved</h2>
              <p className="section-header__sub">Your latest additions</p>
            </div>
            <Link to="/library" className="section-header__link">Library →</Link>
          </div>

          {loading ? (
            <div className="items-grid">
              {[...Array(4)].map((_, i) => (
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
              <h3>Nothing saved yet</h3>
              <p>Click "Save" to add your first article, video, or link.</p>
            </div>
          ) : (
            <div className="items-grid">
              {items.slice(0, 8).map(item => <ItemCard key={item._id} item={item} />)}
            </div>
          )}
        </section>

        {/* Recent Notes */}
        {recentNotes.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <div className="section-header">
              <div>
                <h2 className="section-header__title">Workspace Notes</h2>
                <p className="section-header__sub">Your written knowledge</p>
              </div>
            </div>
            <div className="items-grid">
              {recentNotes.map(note => (
                <Link key={note._id} to={`/workspace/${note.workspace?._id || note.workspace}`} className="item-card animate-fade" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                  <div className="card-body" style={{ flex: 1 }}>
                    <div className="card-body__meta">
                      <span className="card-body__cluster" style={{ color: 'var(--type-note)', background: 'color-mix(in srgb, var(--type-note) 12%, transparent)' }}>
                        {note.workspace?.name || 'note'}
                      </span>
                    </div>
                    <p className="card-body__title">{note.title || 'Untitled Note'}</p>
                  </div>
                  {/* Footer — actions fade in on hover exactly like other cards */}
                  <div className="card-footer">
                    <span className="card-footer__time">
                      {note.createdAt ? formatRelative(note.createdAt) : 'Just now'}
                    </span>
                    <div className="card-actions" onClick={e => e.stopPropagation()}>
                      <button className="card-btn card-btn--fav" title="Favorite">
                        <i className="ri-heart-line" />
                      </button>
                      <button className="card-btn card-btn--danger" onClick={(e) => { e.preventDefault(); handleDeleteNote(e, note._id); }} title="Delete Note">
                        <i className="ri-delete-bin-line" />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 className="section-header__title" style={{ marginBottom: 16 }}>Your Tags</h2>
            <div className="tag-cloud">
              {tags.map(({ tag, count }) => (
                <Link key={tag} to={`/library?tag=${tag}`} className="tag-cloud-item">
                  <span>{tag}</span>
                  <span className="count">{count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section>
          <div className="quick-links">
            {[
              { to: '/graph', icon: 'ri-node-tree', title: 'Knowledge Graph', desc: 'Visualize connections between ideas' },
              { to: '/search', icon: 'ri-search-2-line', title: 'Semantic Search', desc: 'Find anything in your library' },
              { to: '/resurface', icon: 'ri-history-line', title: 'Memory Resurface', desc: 'Rediscover forgotten gems from your past' },
            ].map(item => (
              <Link key={item.to} to={item.to} className="quick-link-item">
                <div className="icon-wrap"><i className={item.icon} /></div>
                <div className="quick-link-item__info">
                  <p className="quick-link-item__title">{item.title}</p>
                  <p className="quick-link-item__desc">{item.desc}</p>
                </div>
                <i className="ri-arrow-right-line arrow" />
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
