import React, { useState } from 'react';
import { useItems } from '../../context/ItemsContext';
import { formatRelative, getTypeIcon, getTypeColor, getClusterColor, getDomain, truncate } from '../../utils/helpers';
import './ItemCard.css';

export default function ItemCard({ item, onOpen }) {
  const { toggleFavorite, deleteItem } = useItems();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleFavorite = (e) => {
    e.stopPropagation();
    toggleFavorite(item._id);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (window.confirm('Delete this item?')) deleteItem(item._id);
  };

  return (
    <div className="item-card animate-fade" onClick={() => onOpen?.(item)}>
      {/* Thumbnail */}
      {item.thumbnail && !imgError ? (
        <div className="card-thumb">
          <img src={item.thumbnail} alt="" onError={() => setImgError(true)} />
          <div className="card-type-badge" style={{ background: getTypeColor(item.type) }}>
            {getTypeIcon(item.type)}
          </div>
        </div>
      ) : (
        <div className="card-thumb-placeholder" style={{ background: `${getClusterColor(item.topicCluster)}15` }}>
          <span className="card-type-icon" style={{ color: getTypeColor(item.type) }}>
            {getTypeIcon(item.type)}
          </span>
        </div>
      )}

      {/* Body */}
      <div className="card-body">
        <div className="card-meta">
          {item.source && <span className="card-source">{getDomain(item.source || item.url)}</span>}
          {item.topicCluster && (
            <span className="card-cluster" style={{ color: getClusterColor(item.topicCluster), background: `${getClusterColor(item.topicCluster)}15` }}>
              {item.topicCluster}
            </span>
          )}
        </div>

        <h3 className="card-title line-clamp-2">{item.title}</h3>

        {item.description && (
          <p className="card-desc line-clamp-2">{item.description}</p>
        )}

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div className="card-tags">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
            {item.tags.length > 3 && (
              <span className="tag-pill">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="card-footer">
        <span className="card-time">{formatRelative(item.createdAt)}</span>
        <div className="card-actions">
          <button
            className={`action-btn ${item.isFavorite ? 'favorited' : ''}`}
            onClick={handleFavorite}
            title="Favorite"
          >
            {item.isFavorite ? '♥' : '♡'}
          </button>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn"
              onClick={e => e.stopPropagation()}
              title="Open original"
            >
              ↗
            </a>
          )}
          <div className="menu-wrap">
            <button
              className="action-btn"
              onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              title="More"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="item-menu animate-scale">
                <button className="menu-item" onClick={handleDelete}>🗑 Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
