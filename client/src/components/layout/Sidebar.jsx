import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'M';

  return (
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
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
            <i className={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {!collapsed && (
          <>
            <div className="sidebar-divider" />
            <p className="sidebar-section-label">Types</p>
            {TYPES.map(t => (
              <NavLink key={t.to} to={t.to} className={({ isActive }) => `sidebar-type-item${isActive ? ' active' : ''}`}>
                <i className={t.icon} />
                <span>{t.label}</span>
              </NavLink>
            ))}
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
  );
}
