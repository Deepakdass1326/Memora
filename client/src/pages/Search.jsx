import './Search.scss';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import api from '../services/api';
import { formatRelative, getTypeColor, getClusterColor } from '../utils/helpers.jsx';

const TYPE_ICONS = {
  article: 'ri-article-line', video: 'ri-play-circle-line', tweet: 'ri-twitter-x-line',
  image: 'ri-image-line', pdf: 'ri-file-pdf-line', note: 'ri-sticky-note-line', link: 'ri-link',
};

// Converts a 0-1 cosine similarity to a human-readable confidence label + colour
const scoreLabel = (score) => {
  if (score >= 0.82) return { label: 'High match', color: '#22c55e' };
  if (score >= 0.65) return { label: 'Good match', color: '#84cc16' };
  if (score >= 0.50) return { label: 'Related',    color: '#eab308' };
  return                    { label: 'Weak match', color: '#94a3b8' };
};

export default function Search() {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [internet,    setInternet]    = useState([]);
  const [videos,      setVideos]      = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [activeMode,  setActiveMode]  = useState(null);        // mode actually used by last request
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    api.get('/search/history').then(res => setRecentSearches(res.data.history || [])).catch(() => {});
  }, []);

  const handleDeleteHistory = async (hs) => {
    try {
      await api.delete(`/search/history/${encodeURIComponent(hs)}`);
      setRecentSearches(prev => prev.filter(x => x !== hs));
    } catch {}
  };

  const doSearch = async (q) => {
    if (!q || !q.trim()) {
      setResults([]);
      setInternet([]);
      setVideos([]);
      setSearched(false);
      setActiveMode(null);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/search', { params: { q } });
      setResults(res.data.data || []);
      setInternet(res.data.internet || []);
      setVideos(res.data.videos || []);
      setActiveMode(res.data.mode);
      setRecentSearches(prev => [q, ...prev.filter(x => x !== q)].slice(0, 15));
    } catch {
      setResults([]);
      setInternet([]);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // Just update local state — NO API call on every keystroke
  const handleChange = (e) => setQuery(e.target.value);

  const highlight = (text) => {
    if (!text || !query || activeMode === 'semantic') return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header title="Search" subtitle="Find anything in your second brain" />
      <div className="page-inner search-page">

        {/* Search box */}
        <div className="search-box" style={{ marginBottom: 12 }}>
          <i className="ri-search-2-line search-icon" />
          <input
            ref={inputRef}
            id="search-input"
            type="text"
            placeholder='Search your library or the web…'
            value={query}
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          />
          <div className="search-right">
            {query && (
              <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setInternet([]); setVideos([]); setSearched(false); }}>
                <i className="ri-close-line" />
              </button>
            )}
            <button
              id="search-submit-btn"
              onClick={() => doSearch(query)}
              disabled={!query.trim() || loading}
              style={{
                padding: '6px 16px',
                background: query.trim() ? 'var(--accent)' : 'var(--muted)',
                color: query.trim() ? '#fff' : 'var(--muted-foreground)',
                border: 'none',
                borderRadius: 8,
                cursor: query.trim() ? 'pointer' : 'default',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }} /> : 'Search'}
            </button>
          </div>
        </div>



        {searched && !loading && (
          <p className="search-count">
            {results.length > 0 || internet.length > 0 || videos.length > 0
              ? `Found ${results.length} local item${results.length !== 1 ? 's' : ''}, plus web results for "${query}"`
              : `No results for "${query}"`}
          </p>
        )}

        {/* Loading skeletons */}
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
        {!loading && (results.length > 0 || internet.length > 0 || videos.length > 0) && (
          <div className="search-results-container" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Local Library Results */}
            {results.length > 0 && (
              <div className="result-section">
                <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                  <i className="ri-database-2-line" /> From your library
                </h3>
                <div className="search-results">
                  {results.map((item, idx) => {
                    const clr  = getClusterColor(item.topicCluster);
                    const tClr = getTypeColor(item.type);
                    const sim  = item._semanticScore;
                    const conf = sim ? scoreLabel(sim) : null;

                    return (
                      <Link
                        key={item._id}
                        to={`/item/${item._id}`}
                        className="search-result animate-fade"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="sr-rank">#{idx + 1}</div>
                        <div className="sr-type-icon" style={{ background: `${tClr}15`, color: tClr }}>
                          <i className={TYPE_ICONS[item.type] || 'ri-link'} />
                        </div>
                        <div className="sr-body">
                          <p className="sr-title">{highlight(item.title)}</p>
                          {item.description && (
                            <p className="sr-desc">{item.description.slice(0, 110)}{item.description.length > 110 ? '…' : ''}</p>
                          )}
                          <div className="sr-meta">
                            {item.topicCluster && (
                              <span className="sr-cluster" style={{ color: clr, background: `${clr}15` }}>{item.topicCluster}</span>
                            )}
                            <span className="sr-time">{formatRelative(item.createdAt)}</span>
                            {item.tags?.slice(0, 3).map(t => (
                              <span key={t} className="tag-pill" style={{ fontSize: '.65rem', padding: '1px 8px' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        {conf && (
                          <div className="sr-score" style={{ color: conf.color, borderColor: `${conf.color}30`, background: `${conf.color}10` }}>
                            <span className="score-pct">{Math.round(sim * 100)}%</span>
                            <span className="score-lbl">{conf.label}</span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* YouTube Results */}
            {videos.length > 0 && (
              <div className="result-section animate-fade" style={{ animationDelay: '200ms' }}>
                 <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff0000' }}>
                  <i className="ri-youtube-fill" /> YouTube Videos
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {videos.map((vid, idx) => (
                    <a key={`vid-${idx}`} href={vid.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', background: 'var(--card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', transition: 'transform 0.2s, borderColor 0.2s' }} onMouseOver={e=>e.currentTarget.style.borderColor='var(--foreground)'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                       {vid.thumbnail ? (
                         <img src={vid.thumbnail} alt={vid.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                       ) : (
                         <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--muted)', display: 'grid', placeItems: 'center' }}><i className="ri-play-circle-line" style={{fontSize: '2rem', color: 'var(--muted-foreground)'}} /></div>
                       )}
                       <div style={{ padding: '12px' }}>
                         <p style={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.4, margin: 0 }}>{vid.title}</p>
                         {vid.duration && <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '6px', display: 'inline-block', background: 'var(--muted)', padding: '2px 6px', borderRadius: '4px' }}>{vid.duration}</span>}
                       </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Web Articles Results */}
            {internet.length > 0 && (
              <div className="result-section animate-fade" style={{ animationDelay: '300ms' }}>
                 <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6' }}>
                  <i className="ri-earth-line" /> On the Web
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                  {internet.map((web, idx) => {
                    let domain = '';
                    try { domain = new URL(web.url).hostname.replace('www.', ''); } catch(e){}
                    return (
                      <a key={`web-${idx}`} href={web.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', background: 'var(--card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', transition: 'borderColor 0.2s' }} onMouseOver={e=>e.currentTarget.style.borderColor='var(--foreground)'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                        <p style={{ fontWeight: 500, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '8px', lineHeight: 1.3 }}>{web.title}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--foreground)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{web.description}</p>
                        {domain && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="ri-links-line" /> {domain}
                            {web.source && <span style={{ fontSize: '0.65rem', background: 'var(--muted)', padding: '1px 6px', borderRadius: '4px' }}>{web.source}</span>}
                          </p>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Empty */}
        {!loading && searched && results.length === 0 && internet.length === 0 && videos.length === 0 && (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="icon"><i className="ri-search-line" /></div>
            <h3>No results found</h3>
            <p>Try different keywords or browse by tag.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/library" style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: '.875rem', fontWeight: 500 }}>
                Browse Library
              </Link>
            </div>
          </div>
        )}

        {/* Hints / History (initial state) */}
        {!searched && (
          <div className="search-hints" style={{ marginTop: 24 }}>
            {recentSearches.length > 0 ? (
              <>
                <p className="hints-label" style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: 12 }}>
                  Recent Searches
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentSearches.map(hs => (
                    <div key={hs} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--foreground)', fontSize: '0.95rem' }} onClick={() => { setQuery(hs); doSearch(hs); }}>
                        <i className="ri-history-line" style={{ color: 'var(--muted-foreground)' }} /> {hs}
                      </button>
                      <button style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', borderRadius: '8px' }} onClick={(e) => { e.stopPropagation(); handleDeleteHistory(hs); }} title="Remove from history">
                         <i className="ri-close-line" style={{ fontSize: '1.2rem' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="hints-label" style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: 12 }}>
                  Try asking in natural language
                </p>
                <div className="hints-grid">
                  {[
                    { icon: 'ri-brain-line',        text: '"productivity systems for deep work"' },
                    { icon: 'ri-lightbulb-line',    text: '"how machine learning works"' },
                    { icon: 'ri-heart-pulse-line',  text: '"improve sleep and recovery"' },
                    { icon: 'ri-sparkling-2-line',  text: '"creative inspiration for design"' },
                  ].map(h => (
                    <div key={h.text} className="hint-item"><i className={h.icon} /><span>{h.text}</span></div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
