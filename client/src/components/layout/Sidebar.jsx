import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { generateAvatarUrl } from '../../utils/helpers';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', icon: '◈', label: 'Dashboard', exact: true },
  { to: '/library', icon: '⊞', label: 'Library' },
  { to: '/graph', icon: '⬡', label: 'Knowledge Graph' },
  { to: '/search', icon: '⌕', label: 'Search' },
  { to: '/resurface', icon: '◎', label: 'Memory' },
];

const TYPE_FILTERS = [
  { type: 'article', icon: '📄', label: 'Articles' },
  { type: 'video', icon: '▶', label: 'Videos' },
  { type: 'tweet', icon: '𝕏', label: 'Tweets' },
  { type: 'image', icon: '⬚', label: 'Images' },
  { type: 'pdf', icon: '▣', label: 'PDFs' },
  { type: 'note', icon: '◻', label: 'Notes' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collections, setCollections] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    api.get('/collections').then(r => setCollections(r.data.data)).catch(() => {});
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">M</div>
        {!collapsed && <span className="logo-text">memora</span>}
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Main Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-divider" />

      {/* Type filters */}
      {!collapsed && (
        <div className="sidebar-section">
          <p className="section-title">Types</p>
          {TYPE_FILTERS.map(f => (
            <NavLink
              key={f.type}
              to={`/library?type=${f.type}`}
              className={({ isActive }) =>
                `nav-item type-item ${location.search.includes(f.type) ? 'active' : ''}`
              }
            >
              <span className="nav-icon type-icon">{f.icon}</span>
              <span className="nav-label">{f.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      <div className="sidebar-divider" />

      {/* Collections */}
      {!collapsed && collections.length > 0 && (
        <div className="sidebar-section sidebar-collections">
          <div className="section-header">
            <p className="section-title">Collections</p>
            <NavLink to="/collections" className="section-action">All</NavLink>
          </div>
          <div className="collections-list">
            {collections.slice(0, 6).map(col => (
              <NavLink
                key={col._id}
                to={`/library?collection=${col._id}`}
                className="collection-item"
              >
                <span style={{ color: col.color }}>{col.emoji}</span>
                <span className="collection-name truncate">{col.name}</span>
                <span className="collection-count">{col.itemCount}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <div className="user-section">
            <img
              src={user.avatar || generateAvatarUrl(user.name)}
              alt={user.name}
              className="user-avatar"
            />
            {!collapsed && (
              <div className="user-info">
                <p className="user-name truncate">{user.name}</p>
                <p className="user-email truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button className="logout-btn" onClick={logout} title="Logout">⎋</button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
