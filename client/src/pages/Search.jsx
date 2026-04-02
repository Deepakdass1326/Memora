import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import api from '../services/api';
import { getTypeIcon, getClusterColor, formatRelative } from '../utils/helpers';
import './Search.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/search', { params: { q } });
      setResults(res.data.data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  return (
    <div className="main-content">
      <Header title="Search" subtitle="Find anything in your library" />
      <div className="page-content search-page">

        {/* Search Input */}
        <div className="search-hero">
          <div className="search-input-wrap">
            <span className="search-icon">⌕</span>
            <input
              ref={inputRef}
              type="text"
              className="search-input-large"
              placeholder="Search by title, content, tags..."
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setSearched(false); }}>
                ✕
              </button>
            )}
            <kbd className="search-kbd">⌘K</kbd>
          </div>
          {searched && !loading && (
            <p className="search-result-count">
              {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` : `No results for "${query}"`}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="search-loading">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="search-result-skeleton">
                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="search-results">
            {results.map(item => (
              <SearchResult key={item._id} item={item} query={query} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && searched && results.length === 0 && (
          <div className="empty-state">
            <div className="icon">⌕</div>
            <h3>No results found</h3>
            <p>Try different keywords or browse your library by tag or type.</p>
            <Link to="/library" className="btn-primary" style={{ marginTop: 16, display: 'inline-block', padding: '10px 24px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', textDecoration: 'none', background: 'var(--accent)', color: 'white' }}>
              Browse Library
            </Link>
          </div>
        )}

        {/* Initial hints */}
        {!searched && (
          <div className="search-hints">
            <p className="hints-title">Search tips</p>
            <div className="hints-grid">
              {[
                { icon: '🏷', text: 'Search by tag: "ai" or "design"' },
                { icon: '📄', text: 'Find articles by title keywords' },
                { icon: '📝', text: 'Search your notes content' },
                { icon: '⌕', text: 'Full-text search across all saved items' },
              ].map(h => (
                <div key={h.text} className="hint-item">
                  <span>{h.icon}</span>
                  <span>{h.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResult({ item, query }) {
  const highlight = (text) => {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
    );
  };

  return (
    <div className="search-result animate-fade">
      <div className="sr-type" style={{ background: `${getClusterColor(item.topicCluster)}15`, color: getClusterColor(item.topicCluster) }}>
        {getTypeIcon(item.type)}
      </div>
      <div className="sr-body">
        <h3 className="sr-title">{highlight(item.title)}</h3>
        {item.tags?.length > 0 && (
          <div className="sr-tags">
            {item.tags.slice(0, 4).map(t => (
              <span key={t} className={`tag-pill ${query && t.toLowerCase().includes(query.toLowerCase()) ? 'active' : ''}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="sr-meta">
          {item.topicCluster && (
            <span className="sr-cluster" style={{ color: getClusterColor(item.topicCluster) }}>
              {item.topicCluster}
            </span>
          )}
          <span className="sr-time">{formatRelative(item.createdAt)}</span>
        </div>
      </div>
      <div className="sr-actions">
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="sr-open-btn">
            Open ↗
          </a>
        )}
      </div>
    </div>
  );
}
