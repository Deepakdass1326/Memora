import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SaveItemModal from '../save/SaveItemModal';
import './Header.css';

export default function Header({ title, subtitle }) {
  const [showSave, setShowSave] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="header">
        <div className="header-left">
          {title && (
            <div>
              <h1 className="header-title">{title}</h1>
              {subtitle && <p className="header-subtitle">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="header-right">
          <button className="search-shortcut" onClick={() => navigate('/search')}>
            <span>⌕</span>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
          <button className="save-btn" onClick={() => setShowSave(true)}>
            <span>+</span>
            <span>Save</span>
          </button>
        </div>
      </header>
      {showSave && <SaveItemModal onClose={() => setShowSave(false)} />}
    </>
  );
}
