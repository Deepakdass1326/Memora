import './ItemCard.scss';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItems } from '../../context/ItemsContext';
import { formatRelative, getTypeColor, getClusterColor, getDomain } from '../../utils/helpers.jsx';

const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function ItemCard({ item, onOpen }) {
  const { toggleFavorite, deleteItem } = useItems();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => { if (onOpen) onOpen(item); else navigate(`/item/${item._id}`); };
  const handleFav   = (e) => { e.stopPropagation(); toggleFavorite(item._id); };
  const handleDelete = (e) => {
    e.stopPropagation(); setMenuOpen(false);
    if (window.confirm('Delete this item?')) deleteItem(item._id);
  };

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
          {item.topicCluster && (
            <span className="card-body__cluster" style={{ color: clusterColor, background: `${clusterColor}15` }}>
              {item.topicCluster}
            </span>
          )}
        </div>
        <h3 className="card-body__title">{item.title}</h3>
        {item.description && <p className="card-body__desc">{item.description}</p>}
        {item.tags?.length > 0 && (
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
            <button className="card-btn" onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} title="More">
              <i className="ri-more-2-line" />
            </button>
            {menuOpen && (
              <div className="card-menu__dropdown animate-scale">
                <button className="card-menu__item card-menu__item--danger" onClick={handleDelete}>
                  <i className="ri-delete-bin-line" />Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
