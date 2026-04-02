import React from 'react';
import Header from '../components/layout/Header';
import KnowledgeGraph from '../components/graph/KnowledgeGraph';

export default function GraphPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header title="Knowledge Graph" subtitle="See how your ideas connect" />
      <div className="graph-wrap">
        <KnowledgeGraph />
      </div>
    </div>
  );
}
