import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import api from '../../services/api';
import { getClusterColor, getTypeIcon } from '../../utils/helpers';
import './KnowledgeGraph.css';

const CLUSTER_COLORS = {
  technology: '#3B82F6', design: '#8B5CF6', science: '#10B981',
  business: '#F59E0B', health: '#EF4444', philosophy: '#6366F1',
  culture: '#EC4899', productivity: '#14B8A6', general: '#94A3B8',
};

export default function KnowledgeGraph() {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/items/graph')
      .then(r => setGraphData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const drawGraph = useCallback(() => {
    if (!graphData || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    // Defs for glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

    let { nodes, links } = graphData;

    // Filter
    if (filter !== 'all') {
      const nodeIds = new Set(nodes.filter(n => n.cluster === filter).map(n => String(n.id)));
      nodes = nodes.filter(n => nodeIds.has(String(n.id)));
      links = links.filter(l => nodeIds.has(String(l.source)) && nodeIds.has(String(l.target)));
    }

    const nodesCopy = nodes.map(d => ({ ...d }));
    const linksCopy = links.map(d => ({ ...d }));

    const sim = d3.forceSimulation(nodesCopy)
      .force('link', d3.forceLink(linksCopy).id(d => String(d.id)).distance(80).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(30));

    // Links
    const link = g.append('g').selectAll('line')
      .data(linksCopy)
      .join('line')
      .attr('class', 'graph-link')
      .attr('stroke', '#E8E6DF')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6);

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(nodesCopy)
      .join('g')
      .attr('class', 'graph-node')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (e, d) => { e.stopPropagation(); setSelectedNode(d); });

    // Node circles
    node.append('circle')
      .attr('r', d => 10 + Math.min((graphData.clusters[d.tags?.[0]] || []).length, 5) * 2)
      .attr('fill', d => CLUSTER_COLORS[d.cluster] || '#94A3B8')
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => CLUSTER_COLORS[d.cluster] || '#94A3B8')
      .attr('stroke-width', 1.5);

    // Node type icon
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .text(d => getTypeIcon(d.type));

    // Node labels
    node.append('text')
      .attr('class', 'node-label')
      .attr('y', d => 20 + Math.min((graphData.clusters[d.tags?.[0]] || []).length, 5) * 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#6B6860')
      .text(d => d.label?.substring(0, 20) || '');

    // Tooltip
    node.append('title').text(d => d.label);

    svg.on('click', () => setSelectedNode(null));

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom to fit
    setTimeout(() => {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.scale(0.8).translate(W * 0.1, H * 0.1));
    }, 500);

  }, [graphData, filter]);

  useEffect(() => { drawGraph(); }, [drawGraph]);

  useEffect(() => {
    const ro = new ResizeObserver(drawGraph);
    if (svgRef.current) ro.observe(svgRef.current.parentElement);
    return () => ro.disconnect();
  }, [drawGraph]);

  const clusters = graphData ? [...new Set(graphData.nodes.map(n => n.cluster))].filter(Boolean) : [];

  if (loading) return (
    <div className="graph-loading">
      <div className="graph-loading-text">Building your knowledge graph…</div>
    </div>
  );

  if (!graphData?.nodes?.length) return (
    <div className="empty-state">
      <div className="icon">⬡</div>
      <h3>No connections yet</h3>
      <p>Save more items to see how your knowledge connects and clusters.</p>
    </div>
  );

  return (
    <div className="graph-container">
      {/* Controls */}
      <div className="graph-controls">
        <button className={`cluster-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All
        </button>
        {clusters.map(c => (
          <button
            key={c}
            className={`cluster-filter ${filter === c ? 'active' : ''}`}
            style={filter === c ? { background: `${CLUSTER_COLORS[c]}20`, color: CLUSTER_COLORS[c], borderColor: CLUSTER_COLORS[c] } : {}}
            onClick={() => setFilter(filter === c ? 'all' : c)}
          >
            <span className="cluster-dot" style={{ background: CLUSTER_COLORS[c] }} />
            {c}
          </button>
        ))}
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="graph-svg" />

      {/* Legend */}
      <div className="graph-legend">
        <p className="legend-title">Topic Clusters</p>
        {clusters.map(c => (
          <div key={c} className="legend-item">
            <span className="legend-dot" style={{ background: CLUSTER_COLORS[c] }} />
            <span>{c}</span>
          </div>
        ))}
      </div>

      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="node-detail animate-scale">
          <div className="node-detail-header">
            <span className="node-type-icon">{getTypeIcon(selectedNode.type)}</span>
            <div>
              <p className="node-detail-title">{selectedNode.label}</p>
              <p className="node-detail-cluster" style={{ color: CLUSTER_COLORS[selectedNode.cluster] }}>
                {selectedNode.cluster}
              </p>
            </div>
            <button onClick={() => setSelectedNode(null)}>✕</button>
          </div>
          {selectedNode.tags?.length > 0 && (
            <div className="node-detail-tags">
              {selectedNode.tags.map(t => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="graph-stats">
        <span>{graphData.nodes.length} items</span>
        <span>·</span>
        <span>{graphData.links.length} connections</span>
        <span>·</span>
        <span>{clusters.length} clusters</span>
      </div>
    </div>
  );
}
