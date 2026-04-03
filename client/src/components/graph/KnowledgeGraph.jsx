import './KnowledgeGraph.scss';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import api from '../../services/api';
import { getClusterColor } from '../../utils/helpers.jsx';

const CLUSTER_COLORS = {
  technology:'#3B82F6', design:'#8B5CF6', science:'#10B981',
  business:'#F59E0B', health:'#EF4444', philosophy:'#6366F1',
  culture:'#EC4899', productivity:'#14B8A6', general:'#94A3B8',
};
const TYPE_ICONS_RI = { article:'ri-article-line', video:'ri-play-circle-line', tweet:'ri-twitter-x-line', image:'ri-image-line', pdf:'ri-file-pdf-line', note:'ri-sticky-note-line', link:'ri-link' };

export default function KnowledgeGraph() {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/items/graph').then(r => setGraphData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const drawGraph = useCallback(() => {
    if (!graphData || !svgRef.current) return;
    const container = svgRef.current.parentElement;
    const W = container.clientWidth || 800;
    const H = container.clientHeight || 600;
    if (W === 0 || H === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current).attr('width', W).attr('height', H);
    const g = svg.append('g');
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

    let { nodes, links } = graphData;
    if (filter !== 'all') {
      const ids = new Set(nodes.filter(n => n.cluster === filter).map(n => String(n.id)));
      nodes = nodes.filter(n => ids.has(String(n.id)));
      links = links.filter(l => ids.has(String(l.source)) && ids.has(String(l.target)));
    }
    const nodesCopy = nodes.map(d => ({ ...d }));
    const linksCopy = links.map(d => ({ ...d }));

    const sim = d3.forceSimulation(nodesCopy)
      .force('link', d3.forceLink(linksCopy).id(d => String(d.id)).distance(100).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(45));

    const link = g.append('g').selectAll('line').data(linksCopy).join('line')
      .attr('stroke', 'var(--border)').attr('stroke-width', 1.5).attr('stroke-opacity', 0.6);

    const node = g.append('g').selectAll('g').data(nodesCopy).join('g').style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (e, d) => { e.stopPropagation(); setSelectedNode(d); });

    node.append('circle')
      .attr('r', d => 12 + Math.min((graphData.clusters[d.tags?.[0]] || []).length, 5) * 2)
      .attr('fill', d => CLUSTER_COLORS[d.cluster] || '#94A3B8')
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => CLUSTER_COLORS[d.cluster] || '#94A3B8')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', '14px').attr('fill', 'var(--muted-fg)').text('◈');

    node.append('text')
      .attr('y', d => 24 + Math.min((graphData.clusters[d.tags?.[0]] || []).length, 5) * 2)
      .attr('text-anchor', 'middle').attr('font-size', '9px').attr('fill', 'var(--muted-fg)')
      .text(d => d.label?.substring(0, 22) || '');

    node.append('title').text(d => d.label);
    svg.on('click', () => setSelectedNode(null));
    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    setTimeout(() => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.scale(0.8).translate(W * 0.1, H * 0.1)), 500);
  }, [graphData, filter]);

  useEffect(() => { drawGraph(); }, [drawGraph]);
  useEffect(() => {
    const ro = new ResizeObserver(drawGraph);
    if (svgRef.current) ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, [drawGraph]);

  const clusters = graphData ? [...new Set(graphData.nodes.map(n => n.cluster))].filter(Boolean) : [];

  if (loading) return <div className="graph-loading">Building your knowledge graph…</div>;
  if (!graphData?.nodes?.length) return (
    <div className="empty-state" style={{ height: '100%', justifyContent: 'center' }}>
      <div className="icon"><i className="ri-node-tree" /></div>
      <h3>No connections yet</h3>
      <p>Save more items to see how your knowledge connects and clusters.</p>
    </div>
  );

  return (
    <>
      {/* Controls */}
      <div className="graph-controls">
        <button className={`gc-btn ${filter === 'all' ? 'active' : ''}`} style={filter === 'all' ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}} onClick={() => setFilter('all')}>All</button>
        {clusters.map(c => (
          <button key={c} className={`gc-btn ${filter === c ? 'active' : ''}`}
            style={filter === c ? { background: `${CLUSTER_COLORS[c]}15`, color: CLUSTER_COLORS[c], borderColor: `${CLUSTER_COLORS[c]}40` } : {}}
            onClick={() => setFilter(filter === c ? 'all' : c)}
          >
            <span className="dot" style={{ background: CLUSTER_COLORS[c] }} />{c}
          </button>
        ))}
      </div>

      {/* SVG */}
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Legend */}
      <div className="graph-legend">
        <p className="legend-title">Topic Clusters</p>
        {clusters.map(c => (
          <div key={c} className="legend-item">
            <span className="dot" style={{ background: CLUSTER_COLORS[c] }} />{c}
          </div>
        ))}
      </div>

      {/* Node panel */}
      {selectedNode && (
        <div className="node-detail-panel animate-scale">
          <div className="ndp-header">
            <div className="ndp-icon" style={{ background: `${CLUSTER_COLORS[selectedNode.cluster]}15`, color: CLUSTER_COLORS[selectedNode.cluster] }}>
              <i className={TYPE_ICONS_RI[selectedNode.type] || 'ri-link'} />
            </div>
            <div className="ndp-info">
              <p>{selectedNode.label}</p>
              <small style={{ color: CLUSTER_COLORS[selectedNode.cluster] }}>{selectedNode.cluster}</small>
            </div>
            <button className="ndp-close" onClick={() => setSelectedNode(null)}><i className="ri-close-line" /></button>
          </div>
          {selectedNode.tags?.length > 0 && (
            <div className="ndp-tags">
              {selectedNode.tags.map(t => <span key={t} className="tag-pill" style={{ fontSize: '.68rem' }}>{t}</span>)}
            </div>
          )}
          {selectedNode.workspaceName && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0 0' }}>
              <i className="ri-layout-grid-line" /> From Workspace: {selectedNode.workspaceName}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="graph-stats">
        <span>{graphData.nodes.length} items</span>
        <span className="dot">•</span>
        <span>{graphData.links.length} links</span>
        <span className="dot">•</span>
        <span>{clusters.length} clusters</span>
      </div>
    </>
  );
}
