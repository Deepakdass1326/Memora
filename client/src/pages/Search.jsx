import './Search.scss';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import api from '../services/api';
import { formatRelative, getTypeColor, getClusterColor } from '../utils/helpers.jsx';

const TYPE_ICONS = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try { const res = await api.get('/search', { params: { q } }); setResults(res.data.data); }
    catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value; setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const highlight = (text) => {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header title="Search" subtitle="Find anything in your library" />
      <div className="page-inner search-page">

        {/* Search box */}
        <div className="search-box" style={{ marginBottom: 16 }}>
          <i className="ri-search-2-line search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by title, content, tags…"
            value={query}
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          />
          <div className="search-right">
            {query && <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setSearched(false); }}><i className="ri-close-line" /></button>}
            <kbd>⌘K</kbd>
          </div>
        </div>
        {searched && !loading && <p className="search-count">{results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"` : `No results for "${query}"`}</p>}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '65%' }} />
                  <div className="skeleton" style={{ height: 11, width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="search-results" style={{ marginTop: 8 }}>
            {results.map(item => {
              const clr = getClusterColor(item.topicCluster);
              const tClr = getTypeColor(item.type);
              return (
                <div key={item._id} className="search-result animate-fade">
                  <div className="sr-type-icon" style={{ background: `${tClr}15`, color: tClr }}>
                    <i className={TYPE_ICONS[item.type] || 'ri-link'} />
                  </div>
                  <div className="sr-body">
                    <p className="sr-title">{highlight(item.title)}</p>
                    <div className="sr-meta">
                      {item.topicCluster && <span className="sr-cluster" style={{ color: clr, background: `${clr}15` }}>{item.topicCluster}</span>}
                      <span className="sr-time">{formatRelative(item.createdAt)}</span>
                      {item.tags?.slice(0, 3).map(t => <span key={t} className="tag-pill" style={{ fontSize: '.65rem', padding: '1px 8px' }}>{t}</span>)}
                    </div>
                  </div>
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="sr-open"><i className="ri-external-link-line" /></a>}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty */}
        {!loading && searched && results.length === 0 && (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="icon"><i className="ri-search-line" /></div>
            <h3>No results found</h3>
            <p>Try different keywords or browse your library by tag or type.</p>
            <Link to="/library" style={{ marginTop: 16, display: 'inline-block', padding: '9px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: '.875rem', fontWeight: 500 }}>Browse Library</Link>
          </div>
        )}

        {/* Hints */}
        {!searched && (
          <div className="search-hints" style={{ marginTop: 24 }}>
            <p style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: 12 }}>Search tips</p>
            <div className="hints-grid">
              {[
                { icon: 'ri-price-tag-3-line', text: 'Search by tag: "ai" or "design"' },
                { icon: 'ri-article-line',     text: 'Find articles by title keywords' },
                { icon: 'ri-sticky-note-line', text: 'Search your notes content' },
                { icon: 'ri-search-eye-line',  text: 'Full-text search across all items' },
              ].map(h => (
                <div key={h.text} className="hint-item"><i className={h.icon} /><span>{h.text}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
