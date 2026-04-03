import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SaveItemModal from '../save/SaveItemModal';
import './Header.scss';

export default function Header({ title, subtitle }) {
  const [showSave, setShowSave] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="page-header">
        <div className="page-header__left">
          {title    && <h1 className="page-header__title">{title}</h1>}
          {subtitle && <p  className="page-header__sub">{subtitle}</p>}
        </div>
        <div className="page-header__right">
          <button className="header-btn" onClick={() => navigate('/search')}>
            <i className="ri-search-line" />
            <span>Search</span>
          </button>
          <button className="header-btn-primary" onClick={() => setShowSave(true)}>
            <i className="ri-add-line" />
            <span>Save</span>
          </button>
        </div>
      </header>
      {showSave && <SaveItemModal onClose={() => setShowSave(false)} />}
    </>
  );
}
