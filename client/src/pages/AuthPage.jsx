import './AuthPage.scss';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const features = [
    { icon: 'ri-bookmark-3-line', text: 'Save anything from the web instantly' },
    { icon: 'ri-brain-line',      text: 'AI tags and clusters your knowledge' },
    { icon: 'ri-node-tree',       text: 'Visualize connections as a graph' },
    { icon: 'ri-history-line',    text: 'Resurface forgotten gems over time' },
  ];

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-page__panel">
        <div>
          <h1><em>memora</em></h1>
          <p className="sub">Your second brain — beautifully organised.</p>
          <div className="features">
            {features.map(f => (
              <div key={f.text} className="feature-item">
                <div className="icon"><i className={f.icon} /></div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="tagline">Built for curious minds.</p>
      </div>

      {/* Right: form */}
      <div className="auth-page__form-wrap">
        <div className="auth-page__form-inner">
          <div className="auth-page__logo-mobile">
            <div className="logo-mark">◈</div>
            <span>memora</span>
          </div>

          <div className="mode-tabs">
            {['login', 'register'].map(m => (
              <button key={m} className={mode === m ? 'active' : ''} onClick={() => { setMode(m); setError(''); }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <h2 className="form-heading">{mode === 'login' ? 'Welcome back' : 'Get started'}</h2>
          <p className="form-sub">{mode === 'login' ? 'Sign in to your second brain' : 'Create your free account'}</p>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'color-mix(in srgb, #ef4444 10%, transparent)', border: '1px solid color-mix(in srgb, #ef4444 25%, transparent)', color: '#ef4444', fontSize: '.85rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" className="form-btn" disabled={loading}>
              {loading ? <><i className="ri-loader-4-line spin" /> Processing…</> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="form-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
