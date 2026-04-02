import './Resurface.scss';
import React, { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import api from '../services/api';
import { formatRelative, getTypeColor, getClusterColor } from '../utils/helpers.jsx';

const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function Resurface() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/resurface').then(r => setGroups(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header title="Memory" subtitle="Rediscover what you saved" />
      <div className="page-inner">
        <div className="resurface-hero">
          <div className="hero-icon"><i className="ri-history-line" /></div>
          <div>
            <h2>Your Second Brain Remembers</h2>
            <p>Items from your past, resurfaced for reflection and reconnection.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ height: 20, width: 160, marginBottom: 16 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(3)].map((_, j) => <div key={j} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <div className="icon"><i className="ri-inbox-archive-line" /></div>
            <h3>Nothing to resurface yet</h3>
            <p>Save items and come back in a few weeks — we'll remind you of forgotten gems.</p>
          </div>
        ) : (
          <div>
            {groups.map(group => (
              <div key={group.label} className="resurface-group">
                <div className="resurface-group-header">
                  <div>
                    <h3>{group.label}</h3>
                    {group.daysAgo && <p className="sub">~{group.daysAgo} days ago</p>}
                  </div>
                  <span className="count">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="resurface-list">
                  {group.items.map(item => <ResurfaceItem key={item._id} item={item} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResurfaceItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = getTypeColor(item.type);
  const clusterColor = getClusterColor(item.topicCluster);

  return (
    <div className={`resurface-item ${expanded ? 'open' : ''} animate-fade`}>
      <div className="ri-main" onClick={() => setExpanded(o => !o)}>
        <span className="ri-dot" style={{ background: clusterColor }} />
        <div className="ri-icon" style={{ background: `${typeColor}15`, color: typeColor }}>
          <i className={TYPE_ICONS[item.type] || 'ri-link'} />
        </div>
        <div className="ri-body">
          <p>{item.title}</p>
          <div className="meta">
            <span className="date">{formatRelative(item.createdAt)}</span>
            {item.topicCluster && <span className="cluster" style={{ color: clusterColor, background: `${clusterColor}15` }}>{item.topicCluster}</span>}
          </div>
        </div>
        <div className="ri-actions">
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="ri-btn" onClick={e => e.stopPropagation()} title="Open original">
              <i className="ri-external-link-line" />
            </a>
          )}
          <button className="ri-btn"><i className={expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} /></button>
        </div>
      </div>
      {expanded && (
        <div className="ri-expanded animate-fade">
          {item.description && <p>{item.description}</p>}
          {item.tags?.length > 0 && (
            <div className="tags">
              {item.tags.map(t => <span key={t} className="tag-pill" style={{ fontSize: '.68rem' }}>{t}</span>)}
            </div>
          )}
          {!item.description && (!item.tags || item.tags.length === 0) && <p style={{ fontStyle: 'italic' }}>No additional details.</p>}
        </div>
      )}
    </div>
  );
}
