import './ItemDetail.scss';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { getClusterColor, getTypeColor, formatDate } from '../utils/helpers.jsx';

const TYPE_ICONS = { article:'ri-article-line', tweet:'ri-twitter-x-line', image:'ri-image-line', video:'ri-play-circle-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };
const HIGHLIGHT_COLORS = [{ label:'Yellow', value:'#FEF08A' }, { label:'Green', value:'#BBF7D0' }, { label:'Blue', value:'#BAE6FD' }, { label:'Pink', value:'#FBCFE8' }, { label:'Purple', value:'#E9D5FF' }];

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState(null);
  const [pickerColor, setPickerColor] = useState('#FEF08A');
  const [highlightNote, setHighlightNote] = useState('');
  const [addingHighlight, setAddingHighlight] = useState(false);
  const [confirmDeleteHighlight, setConfirmDeleteHighlight] = useState(null);

  useEffect(() => {
    api.get(`/items/${id}`).then(r => setItem(r.data.data)).catch(() => setError('Item not found.')).finally(() => setLoading(false));
  }, [id]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 2 && contentRef.current?.contains(sel.anchorNode)) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelectedText(text);
      setSelectionPos({ top: rect.bottom + window.scrollY + 8, left: Math.min(rect.left + window.scrollX, window.innerWidth - 300) });
    } else { setSelectedText(''); setSelectionPos(null); }
  };

  const saveHighlight = async () => {
    if (!selectedText) return;
    setAddingHighlight(true);
    try {
      const res = await api.post(`/items/${id}/highlights`, { text: selectedText, color: pickerColor, note: highlightNote });
      setItem(prev => ({ ...prev, highlights: res.data.data }));
      setSelectedText(''); setSelectionPos(null); setHighlightNote('');
      window.getSelection()?.removeAllRanges();
    } catch (err) { console.error(err); }
    finally { setAddingHighlight(false); }
  };

  const deleteHighlight = async (hid) => {
    if (confirmDeleteHighlight !== hid) { setConfirmDeleteHighlight(hid); return; }
    setConfirmDeleteHighlight(null);
    try { const res = await api.delete(`/items/${id}/highlights/${hid}`); setItem(prev => ({ ...prev, highlights: res.data.data })); }
    catch (err) { console.error(err); }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
      <i className="ri-loader-4-line spin" style={{ fontSize: 32, color: 'var(--accent)' }} />
      <p style={{ color: 'var(--muted-fg)', fontSize: '.875rem' }}>Loading item…</p>
    </div>
  );

  if (error) return (
    <div className="empty-state" style={{ minHeight: '100vh' }}>
      <div className="icon"><i className="ri-error-warning-line" /></div>
      <h3>Error</h3><p>{error}</p>
      <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>← Go Back</button>
    </div>
  );

  const clusterColor = getClusterColor(item.topicCluster);
  const typeColor = getTypeColor(item.type);

  return (
    <div className="detail-shell">
      {/* Sidebar */}
      <div className="detail-sidebar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <span className="icon"><i className="ri-arrow-left-line" /></span>
          Back to Library
        </button>

        <div className="meta-section">
          <p className="meta-label">Source Info</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${typeColor}15`, color: typeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              <i className={TYPE_ICONS[item.type] || 'ri-link'} />
            </div>
            <span style={{ fontSize: '.85rem', fontWeight: 500, textTransform: 'capitalize', color: typeColor }}>{item.type}</span>
          </div>
          <div className="meta-row"><i className="ri-earth-line" /><p>{item.source || (item.url ? new URL(item.url).hostname : '—')}</p></div>
          <div className="meta-row"><i className="ri-calendar-line" /><p>Saved {formatDate(item.createdAt)}</p></div>
          {item.author && <div className="meta-row"><i className="ri-user-line" /><p>By {item.author}</p></div>}
          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="open-link"><i className="ri-external-link-line" />Open Original</a>}
        </div>

        {item.tags?.length > 0 && (
          <div className="meta-section">
            <p className="meta-label">Tags</p>
            <div className="detail-tags">{item.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}</div>
          </div>
        )}

        {item.topicCluster && (
          <div className="meta-section">
            <p className="meta-label">Cluster</p>
            <div className="cluster-badge" style={{ color: clusterColor, background: `${clusterColor}10`, borderColor: `${clusterColor}30` }}>
              <span className="dot" style={{ background: clusterColor }} />{item.topicCluster}
            </div>
          </div>
        )}

        {item.relatedItems?.length > 0 && (
          <div className="meta-section">
            <p className="meta-label">Related Items</p>
            <div className="related-list">
              {item.relatedItems.map(r => (
                <Link key={r._id} to={`/item/${r._id}`} className="related-item">
                  <div className="icon"><i className={TYPE_ICONS[r.type] || 'ri-link'} /></div>
                  <span>{r.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="detail-main">
        <div className="detail-content">
          {item.thumbnail && (
            <div className="detail-thumb"><img src={item.thumbnail} alt={item.title} /></div>
          )}

          <h1 className="detail-title">{item.title}</h1>
          {item.description && (
            <div className="detail-summary-block">
              <p className="detail-summary-text">{item.description}</p>
            </div>
          )}

          {item.content && (
            <div className="detail-body" ref={contentRef} onMouseUp={handleMouseUp}>
              {item.content
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .split(/\n\n|\. (?=[A-Z])/)
                .filter(p => p.trim().length > 30)
                .map((para, i) => <p key={i}>{para.trim()}</p>)
              }
            </div>
          )}

          {/* Highlight picker */}
          {selectedText && selectionPos && (
            <div className="highlight-picker animate-scale" style={{ top: selectionPos.top, left: selectionPos.left }}>
              <p className="picker-quote">"{selectedText.slice(0, 70)}{selectedText.length > 70 ? '…' : ''}"</p>
              <div className="color-row">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c.value} className={`color-btn ${pickerColor === c.value ? 'active' : ''}`} style={{ background: c.value }} onClick={() => setPickerColor(c.value)} title={c.label} />
                ))}
              </div>
              <input className="picker-input" placeholder="Add a thought…" value={highlightNote} onChange={e => setHighlightNote(e.target.value)} />
              <div className="picker-actions">
                <button className="btn-cancel" onClick={() => { setSelectedText(''); setSelectionPos(null); }}>Cancel</button>
                <button className="btn-save" onClick={saveHighlight} disabled={addingHighlight}>
                  {addingHighlight ? <i className="ri-loader-4-line spin" /> : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Highlights */}
          {item.highlights?.length > 0 && (
            <div className="highlights-section">
              <h3><i className="ri-quill-pen-line" />Your Highlights</h3>
              {item.highlights.map(h => (
                <div key={h._id} className="highlight-card" style={{ borderLeftColor: h.color, background: `${h.color}20` }}>
                  <p className="hc-text">"{h.text}"</p>
                  {h.note && <div className="hc-note"><i className="ri-chat-1-line" />{h.note}</div>}
                  <div className="hc-footer">
                    <span className="hc-date">{new Date(h.createdAt).toLocaleDateString()}</span>
                    {confirmDeleteHighlight === h._id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="hc-delete" onClick={() => deleteHighlight(h._id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>✓ Delete</button>
                        <button onClick={() => setConfirmDeleteHighlight(null)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--foreground)' }}>✕</button>
                      </div>
                    ) : (
                      <button className="hc-delete" onClick={() => deleteHighlight(h._id)} title="Delete"><i className="ri-delete-bin-line" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
