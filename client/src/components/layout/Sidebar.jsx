import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWorkspaces } from '../../context/WorkspacesContext';
import './Sidebar.scss';

const NAV = [
  { to: '/',          icon: 'ri-dashboard-line',    label: 'Dashboard'        },
  { to: '/library',   icon: 'ri-book-shelf-line',   label: 'Library'          },
  { to: '/graph',     icon: 'ri-node-tree',          label: 'Knowledge Graph'  },
  { to: '/search',    icon: 'ri-search-line',        label: 'Search'           },
  { to: '/resurface', icon: 'ri-history-line',       label: 'Memory'           },
];

const TYPES = [
  { label: 'Articles', icon: 'ri-article-line',     to: '/library?type=article' },
  { label: 'Videos',   icon: 'ri-play-circle-line', to: '/library?type=video'   },
  { label: 'Tweets',   icon: 'ri-twitter-x-line',   to: '/library?type=tweet'   },
  { label: 'Images',   icon: 'ri-image-line',        to: '/library?type=image'   },
  { label: 'PDFs',     icon: 'ri-file-pdf-line',     to: '/library?type=pdf'     },
  { label: 'Notes',    icon: 'ri-sticky-note-line',  to: '/library?type=note'    },
];

function CreateWorkspaceModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { createWorkspace } = useWorkspaces();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const ws = await createWorkspace(name.trim(), description.trim());
      onCreated(ws);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '2rem', width: '400px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          <i className="ri-layout-grid-line" style={{ marginRight: '0.5rem', color: 'var(--accent)' }} />
          New Workspace
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Workspace Name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Research, Projects, Ideas"
              required
              style={{
                width: '100%', padding: '0.6rem 0.8rem',
                borderRadius: '8px', border: '1px solid var(--border)',
                background: 'var(--background)', color: 'var(--foreground)',
                fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this workspace for?"
              rows={3}
              style={{
                width: '100%', padding: '0.6rem 0.8rem',
                borderRadius: '8px', border: '1px solid var(--border)',
                background: 'var(--background)', color: 'var(--foreground)',
                fontFamily: 'inherit', fontSize: '0.95rem', resize: 'none',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding: '0.6rem 1.2rem', borderRadius: '8px',
              background: 'var(--accent)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { workspaces } = useWorkspaces();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'M';

  // Manual active check for query-param links
  const isTypeActive = (to) => {
    const [path, search] = to.split('?');
    return location.pathname === path && location.search === `?${search}`;
  };
  const isWorkspaceActive = (to) => location.pathname === to;

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo__mark">◈</div>
          {!collapsed && <span className="sidebar-logo__name">memora</span>}
          <button className={`sidebar-logo__toggle${collapsed ? ' rotated' : ''}`} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
            <i className="ri-sidebar-fold-line" />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(item => {
            // Library: only active when on /library with NO type/tag filter
            const isLibraryActive = item.to === '/library'
              ? location.pathname === '/library' && !location.search
              : undefined;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={item.to === '/library'
                  ? `sidebar-nav-item${isLibraryActive ? ' active' : ''}`
                  : ({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                <i className={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {!collapsed && (
            <>
              <div className="sidebar-divider" />
              <p className="sidebar-section-label">Types</p>
              {TYPES.map(t => (
                <Link
                  key={t.to}
                  to={t.to}
                  className={isTypeActive(t.to) ? 'sidebar-type-item active' : 'sidebar-type-item'}
                >
                  <i className={t.icon} />
                  <span>{t.label}</span>
                </Link>
              ))}

              <div className="sidebar-divider" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}>
                <p className="sidebar-section-label" style={{ marginBottom: 0 }}>Workspaces</p>
                <button
                  className="icon-btn"
                  style={{ fontSize: '1rem', padding: '2px 6px' }}
                  onClick={() => setShowCreateModal(true)}
                  title="New Workspace"
                >
                  <i className="ri-add-line" />
                </button>
              </div>
              <div style={{ marginTop: '8px' }}>
                {workspaces && workspaces.slice(0, 8).map(ws => (
                  <Link
                    key={ws._id}
                    to={`/workspace/${ws._id}`}
                    className={isWorkspaceActive(`/workspace/${ws._id}`) ? 'sidebar-type-item active' : 'sidebar-type-item'}
                  >
                    <i className="ri-layout-grid-line" />
                    <span>{ws.name}</span>
                  </Link>
                ))}
                {workspaces?.length === 0 && (
                  <div style={{ fontSize: '0.75rem', padding: '4px 12px', color: 'var(--text-tertiary)' }}>No workspaces yet</div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Theme toggle */}
          <div className={`sidebar-theme-row${collapsed ? ' centered' : ''}`}>
            <i className={theme === 'dark' ? 'ri-moon-line' : 'ri-sun-line'} />
            {!collapsed && (
              <>
                <span className="sidebar-theme-row__label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                <button className={`theme-toggle-btn${theme === 'dark' ? ' on' : ''}`} onClick={toggleTheme} aria-label="Toggle theme">
                  <span className={theme === 'dark' ? 'on' : ''} />
                </button>
              </>
            )}
            {collapsed && <button className="icon-btn" onClick={toggleTheme}><i className="ri-contrast-2-line" /></button>}
          </div>

          {/* User */}
          <div className={`sidebar-user${collapsed ? ' centered' : ''}`} title={user?.name}>
            <div className="sidebar-user__avatar">{initials}</div>
            {!collapsed && (
              <>
                <div className="sidebar-user__info">
                  <p className="sidebar-user__name">{user?.name}</p>
                  <p className="sidebar-user__email">{user?.email}</p>
                </div>
                <button className="sidebar-user__logout" onClick={logout} title="Sign out"><i className="ri-logout-box-r-line" /></button>
              </>
            )}
          </div>
        </div>
      </aside>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(ws) => navigate(`/workspace/${ws._id}`)}
        />
      )}
    </>
  );
}
