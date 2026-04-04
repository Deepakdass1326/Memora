import './ItemCard.scss';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../../context/ItemsContext';
import { formatRelative, getTypeColor, getClusterColor, getDomain } from '../../utils/helpers.jsx';
import api from '../../services/api';

const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function ItemCard({ item, onOpen }) {
  const { toggleFavorite, deleteItem, patchItem } = useItems();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  // ── Auto-poll while AI is processing in the background ──────────────────
  useEffect(() => {
    if (!item.aiProcessing) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/items/${item._id}`);
        if (res.data.success && !res.data.data.aiProcessing) {
          patchItem(item._id, res.data.data);
          clearInterval(interval);
        }
      } catch (_) {}
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [item._id, item.aiProcessing, patchItem]);

  const handleReanalyze = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setReanalyzing(true);
    try {
      const res = await api.post(`/items/${item._id}/reanalyze`);
      if (res.data.success) {
        patchItem(item._id, res.data.data);
      }
    } catch (err) {
      console.error('Reanalyze failed:', err);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleClick = () => { if (onOpen) onOpen(item); else navigate(`/item/${item._id}`); };
  const handleFav   = (e) => { e.stopPropagation(); toggleFavorite(item._id); };
  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setMenuOpen(false); setConfirmDelete(false);
    deleteItem(item._id);
  };
  const handleMenuClose = () => { setMenuOpen(false); setConfirmDelete(false); };

  const typeColor    = getTypeColor(item.type);
  const clusterColor = getClusterColor(item.topicCluster);
  const typeIcon     = TYPE_ICONS[item.type] || 'ri-link';
  const domain       = getDomain(item.source || item.url || '');

  return (
    <div className="item-card animate-fade" onClick={handleClick}>

      {/* Thumbnail */}
      {item.thumbnail && !imgError ? (
        <div className="card-thumb">
          <img src={item.thumbnail} alt="" onError={() => setImgError(true)} />
          <div className="card-thumb__overlay" />
          <div className="card-thumb__type" style={{ background: typeColor }}><i className={typeIcon} /></div>
          {item.isFavorite && <div className="card-thumb__fav"><i className="ri-heart-fill" /></div>}
        </div>
      ) : (
        <div className="card-placeholder" style={{ background: `${clusterColor}15` }}>
          <i className={typeIcon} style={{ color: typeColor }} />
          {item.isFavorite && <div className="card-placeholder__fav"><i className="ri-heart-fill" /></div>}
        </div>
      )}

      {/* Body */}
      <div className="card-body">
      <div className="card-body__meta">
          {domain && <span className="card-body__source">{domain}</span>}
          {item.topicCluster && item.topicCluster !== 'general' && (
            <span className="card-body__cluster" style={{ color: clusterColor, background: `${clusterColor}18` }}>
              {item.topicCluster}
            </span>
          )}
          {(!item.topicCluster || item.topicCluster === 'general') && (
            <span className="card-body__cluster" style={{ color: 'var(--muted-fg)', background: 'var(--muted)' }}>
              {item.type || 'link'}
            </span>
          )}
        </div>
        <h3 className="card-body__title">{item.title}</h3>
        {item.description && <p className="card-body__desc">{item.description}</p>}
        {/* AI Processing Badge */}
        {item.aiProcessing && (
          <div className="card-body__processing">
            <i className="ri-sparkling-2-line" style={{ animation: 'spin 1.5s linear infinite' }} />
            <span>AI tagging...</span>
          </div>
        )}
        {item.tags?.length > 0 && !item.aiProcessing && (
          <div className="card-body__tags">
            {item.tags.slice(0, 3).map(t => <span key={t} className="tag-pill" style={{ fontSize: '.65rem', padding: '1px 8px' }}>{t}</span>)}
            {item.tags.length > 3 && <span className="tag-pill" style={{ fontSize: '.65rem', padding: '1px 8px' }}>+{item.tags.length - 3}</span>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="card-footer">
        <span className="card-footer__time">{formatRelative(item.createdAt)}</span>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className={`card-btn card-btn--fav ${item.isFavorite ? 'active' : ''}`} onClick={handleFav} title="Favorite">
            <i className={item.isFavorite ? 'ri-heart-fill' : 'ri-heart-line'} />
          </button>
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="card-btn" title="Open original" onClick={e => e.stopPropagation()}>
              <i className="ri-external-link-line" />
            </a>
          )}
          <div className="card-menu">
            <button className="card-btn" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); if (menuOpen) setConfirmDelete(false); }} title="More">
              <i className="ri-more-2-line" />
            </button>
            {menuOpen && (
              <div className="card-menu__dropdown animate-scale">
                <button className="card-menu__item" onClick={handleReanalyze} disabled={reanalyzing}>
                  <i className={reanalyzing ? 'ri-loader-2-line' : 'ri-sparkling-2-line'} style={reanalyzing ? { animation: 'spin 1s linear infinite' } : {}} />
                  {reanalyzing ? 'Analyzing...' : 'Re-analyze'}
                </button>
                {!confirmDelete ? (
                  <button className="card-menu__item card-menu__item--danger" onClick={handleDelete}>
                    <i className="ri-delete-bin-line" />Delete
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 4, padding: '4px' }}>
                    <button className="card-menu__item card-menu__item--danger" onClick={handleDelete} style={{ flex: 1, fontSize: '0.78rem' }}>
                      ✓ Yes, delete
                    </button>
                    <button className="card-menu__item" onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} style={{ flex: 1, fontSize: '0.78rem' }}>
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
