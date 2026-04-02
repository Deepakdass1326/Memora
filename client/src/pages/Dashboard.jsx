import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import ItemCard from '../components/dashboard/ItemCard';
import { useItems } from '../context/ItemsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate, getTypeIcon, getClusterColor } from '../utils/helpers';
import './Dashboard.css';

const STAT_TYPES = ['article', 'video', 'tweet', 'image', 'pdf', 'note'];

export default function Dashboard() {
  const { user } = useAuth();
  const { items, fetchItems, loading } = useItems();
  const [resurface, setResurface] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchItems({ limit: 8 });
    api.get('/resurface').then(r => setResurface(r.data.data)).catch(() => {});
    api.get('/tags').then(r => setTags(r.data.data.slice(0, 12))).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length) {
      const counts = {};
      items.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
      setStats(counts);
    }
  }, [items]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="main-content">
      <Header />
      <div className="page-content">

        {/* Hero greeting */}
        <div className="dashboard-hero">
          <div className="hero-text">
            <h1 className="display-md">{greeting},</h1>
            <h1 className="display-md accent-text">{user?.name?.split(' ')[0]}.</h1>
            <p className="hero-sub">
              You have <strong>{user?.stats?.totalItems || items.length}</strong> things saved.
              Your second brain is growing.
            </p>
          </div>
          <div className="hero-stats">
            {STAT_TYPES.filter(t => stats[t]).map(type => (
              <div key={type} className="hero-stat">
                <span className="stat-icon">{getTypeIcon(type)}</span>
                <span className="stat-count">{stats[type]}</span>
                <span className="stat-label">{type}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Memory Resurface */}
        {resurface.length > 0 && (
          <section className="dashboard-section">
            <div className="section-header-row">
              <div>
                <h2 className="section-title-large">◎ From Your Memory</h2>
                <p className="section-desc">Things worth revisiting</p>
              </div>
              <Link to="/resurface" className="see-all-link">See all →</Link>
            </div>
            <div className="resurface-grid">
              {resurface.slice(0, 2).map(group => (
                <div key={group.label} className="resurface-card">
                  <div className="resurface-header">
                    <span className="resurface-label">{group.label}</span>
                    {group.daysAgo && <span className="resurface-days">{group.daysAgo}d ago</span>}
                  </div>
                  <div className="resurface-items">
                    {group.items.map(item => (
                      <Link key={item._id} to={`/library`} className="resurface-item">
                        <span className="ri-icon">{getTypeIcon(item.type)}</span>
                        <div className="ri-content">
                          <p className="ri-title line-clamp-1">{item.title}</p>
                          <div className="ri-tags">
                            {item.tags?.slice(0, 2).map(t => (
                              <span key={t} className="tag-pill" style={{ fontSize: '0.65rem' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        {item.topicCluster && (
                          <span className="ri-cluster" style={{ background: `${getClusterColor(item.topicCluster)}20`, color: getClusterColor(item.topicCluster) }}>
                            {item.topicCluster}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Items */}
        <section className="dashboard-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title-large">Recently Saved</h2>
              <p className="section-desc">Your latest additions</p>
            </div>
            <Link to="/library" className="see-all-link">Library →</Link>
          </div>
          {loading ? (
            <div className="items-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="item-card-skeleton">
                  <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 12, width: '40%' }} />
                    <div className="skeleton" style={{ height: 16, width: '90%' }} />
                    <div className="skeleton" style={{ height: 12, width: '70%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="icon">◈</div>
              <h3>Nothing saved yet</h3>
              <p>Click "Save" in the top right to add your first article, video, or link.</p>
            </div>
          ) : (
            <div className="items-grid">
              {items.slice(0, 8).map(item => (
                <ItemCard key={item._id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Top Tags */}
        {tags.length > 0 && (
          <section className="dashboard-section">
            <h2 className="section-title-large">Your Tags</h2>
            <div className="tags-cloud">
              {tags.map(({ tag, count }) => (
                <Link key={tag} to={`/library?tag=${tag}`} className="tag-cloud-pill">
                  <span>{tag}</span>
                  <span className="tag-count">{count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="dashboard-section">
          <div className="quick-links">
            <Link to="/graph" className="quick-link-card">
              <span className="ql-icon">⬡</span>
              <div>
                <p className="ql-title">Knowledge Graph</p>
                <p className="ql-desc">Visualize connections between your saved items</p>
              </div>
              <span className="ql-arrow">→</span>
            </Link>
            <Link to="/search" className="quick-link-card">
              <span className="ql-icon">⌕</span>
              <div>
                <p className="ql-title">Semantic Search</p>
                <p className="ql-desc">Find anything in your library by meaning</p>
              </div>
              <span className="ql-arrow">→</span>
            </Link>
            <Link to="/resurface" className="quick-link-card">
              <span className="ql-icon">◎</span>
              <div>
                <p className="ql-title">Memory Resurface</p>
                <p className="ql-desc">Rediscover forgotten gems from months ago</p>
              </div>
              <span className="ql-arrow">→</span>
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
