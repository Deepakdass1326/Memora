import React from 'react';
import Header from '../components/layout/Header';
import KnowledgeGraph from '../components/graph/KnowledgeGraph';
import './GraphPage.css';

export default function GraphPage() {
  return (
    <div className="main-content">
      <Header title="Knowledge Graph" subtitle="See how your ideas connect" />
      <div className="page-content graph-page-content">
        <KnowledgeGraph />
      </div>
    </div>
  );
}
