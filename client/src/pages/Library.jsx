import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import ItemCard from '../components/dashboard/ItemCard';
import { useItems } from '../context/ItemsContext';
import api from '../services/api';
import './Library.css';

const TYPES = ['article', 'video', 'tweet', 'image', 'pdf', 'note', 'link'];
const TYPE_ICONS = { article: '📄', video: '▶', tweet: '𝕏', image: '⬚', pdf: '▣', note: '◻', link: '⊞' };

export default function Library() {
  const { items, loading, fetchItems, pagination } = useItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [activeType, setActiveType] = useState(searchParams.get('type') || '');
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/tags').then(r => setTags(r.data.data.slice(0, 20))).catch(() => {});
  }, []);

  useEffect(() => {
    const type = searchParams.get('type') || '';
    const tag = searchParams.get('tag') || '';
    const collection = searchParams.get('collection') || '';
    setActiveType(type);
    setActiveTag(tag);
    fetchItems({ type, tag, collection, page });
  }, [searchParams, page]);

  const setFilter = (key, value) => {
    setPage(1);
    if (value) setSearchParams(prev => { prev.set(key, value); return prev; });
    else setSearchParams(prev => { prev.delete(key); return prev; });
  };

  const clearFilters = () => { setSearchParams({}); setActiveType(''); setActiveTag(''); setPage(1); };

  const hasFilters = activeType || activeTag || searchParams.get('collection');

  return (
    <div className="main-content">
      <Header title="Library" subtitle={`${pagination.total} items`} />
      <div className="page-content">

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-types">
            <button
              className={`type-filter-btn ${!activeType ? 'active' : ''}`}
              onClick={() => setFilter('type', '')}
            >
              All
            </button>
            {TYPES.map(t => (
              <button
                key={t}
                className={`type-filter-btn ${activeType === t ? 'active' : ''}`}
                onClick={() => setFilter('type', activeType === t ? '' : t)}
              >
                <span>{TYPE_ICONS[t]}</span>
                <span>{t}s</span>
              </button>
            ))}
          </div>

          <div className="filter-right">
            {hasFilters && (
              <button className="clear-filters" onClick={clearFilters}>✕ Clear</button>
            )}
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>⊞</button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>☰</button>
            </div>
          </div>
        </div>

        {/* Tag filters */}
        {tags.length > 0 && (
          <div className="tag-filter-row">
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                className={`tag-pill ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setFilter('tag', activeTag === tag ? '' : tag)}
              >
                {tag}
                <span style={{ opacity: 0.5, marginLeft: 4, fontSize: '0.65rem' }}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'items-grid' : 'items-list'}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: viewMode === 'grid' ? 280 : 72, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="icon">◈</div>
            <h3>Nothing here yet</h3>
            <p>{hasFilters ? 'Try adjusting your filters.' : 'Start saving articles, videos, and links to build your library.'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="items-grid">
            {items.map(item => <ItemCard key={item._id} item={item} />)}
          </div>
        ) : (
          <div className="items-list">
            {items.map(item => <ListItem key={item._id} item={item} />)}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ListItem({ item }) {
  const { toggleFavorite } = useItems();
  return (
    <div className="list-item">
      <span className="list-type-icon">{TYPE_ICONS[item.type] || '🔗'}</span>
      <div className="list-content">
        <p className="list-title">{item.title}</p>
        <div className="list-meta">
          {item.source && <span className="list-source">{item.source}</span>}
          {item.tags?.slice(0, 3).map(t => <span key={t} className="tag-pill" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>{t}</span>)}
        </div>
      </div>
      <div className="list-actions">
        <button className={`action-btn ${item.isFavorite ? 'favorited' : ''}`} onClick={() => toggleFavorite(item._id)}>
          {item.isFavorite ? '♥' : '♡'}
        </button>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="action-btn">↗</a>}
      </div>
    </div>
  );
}
