import React, { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import api from '../services/api';
import { getTypeIcon, getClusterColor, formatDate } from '../utils/helpers';
import './Resurface.css';

export default function Resurface() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/resurface')
      .then(r => setGroups(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="main-content">
      <Header title="Memory" subtitle="Rediscover what you saved" />
      <div className="page-content">

        <div className="resurface-hero">
          <div className="resurface-hero-icon">◎</div>
          <div>
            <h2 className="display-md" style={{ fontStyle: 'italic' }}>Your Second Brain Remembers</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.9rem' }}>
              Items from your past, resurfaced for reflection and reconnection.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ height: 16, width: 160, marginBottom: 16, borderRadius: 4 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="icon">◎</div>
            <h3>Nothing to resurface yet</h3>
            <p>Save items and come back in a few weeks — we'll remind you of forgotten gems.</p>
          </div>
        ) : (
          <div className="resurface-sections">
            {groups.map(group => (
              <div key={group.label} className="resurface-section">
                <div className="rs-header">
                  <div>
                    <h3 className="rs-label">{group.label}</h3>
                    {group.daysAgo && (
                      <p className="rs-sublabel">Saved approximately {group.daysAgo} days ago</p>
                    )}
                  </div>
                  <div className="rs-count">{group.items.length} item{group.items.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="rs-items">
                  {group.items.map(item => (
                    <ResurfaceItem key={item._id} item={item} />
                  ))}
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

  return (
    <div className={`rs-item animate-fade ${expanded ? 'expanded' : ''}`}>
      <div className="rsi-main" onClick={() => setExpanded(!expanded)}>
        <div className="rsi-type-dot" style={{ background: getClusterColor(item.topicCluster) }} />
        <div className="rsi-icon">{getTypeIcon(item.type)}</div>
        <div className="rsi-body">
          <p className="rsi-title">{item.title}</p>
          <div className="rsi-meta">
            <span className="rsi-date">{formatDate(item.createdAt)}</span>
            {item.topicCluster && (
              <span className="rsi-cluster" style={{
                color: getClusterColor(item.topicCluster),
                background: `${getClusterColor(item.topicCluster)}15`
              }}>
                {item.topicCluster}
              </span>
            )}
          </div>
        </div>
        <div className="rsi-actions">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rsi-open"
              onClick={e => e.stopPropagation()}
            >
              Open ↗
            </a>
          )}
          <button className="rsi-expand">{expanded ? '↑' : '↓'}</button>
        </div>
      </div>

      {expanded && item.tags?.length > 0 && (
        <div className="rsi-expanded animate-fade">
          <div className="rsi-tags">
            {item.tags.map(t => (
              <span key={t} className="tag-pill" style={{ fontSize: '0.7rem' }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
