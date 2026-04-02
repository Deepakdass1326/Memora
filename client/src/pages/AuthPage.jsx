import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './AuthPage.css';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo-mark">M</div>
          <span className="auth-logo-text">memora</span>
        </div>
        <div className="auth-tagline">
          <h1 className="display-xl" style={{ color: 'white' }}>
            Your second<br />
            <em>brain</em> awaits.
          </h1>
          <p className="auth-desc">
            Save anything from the web. Let AI organize, connect, and resurface it for you.
          </p>
        </div>
        <div className="auth-features">
          {[
            { icon: '⬡', text: 'Knowledge graph visualization' },
            { icon: '◎', text: 'Memory resurfacing' },
            { icon: '✦', text: 'AI-powered tagging' },
            { icon: '⌕', text: 'Semantic search' },
          ].map(f => (
            <div key={f.text} className="auth-feature">
              <span className="af-icon">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
        {/* Decorative pattern */}
        <div className="auth-deco" aria-hidden>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="deco-dot" style={{
              left: `${(i % 5) * 24}%`,
              top: `${Math.floor(i / 5) * 28}%`,
              animationDelay: `${i * 0.15}s`,
              opacity: 0.1 + (i % 4) * 0.08,
            }} />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-toggle">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Create account
            </button>
          </div>

          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Welcome back' : 'Start building'}</h2>
            <p>{mode === 'login' ? 'Sign in to your Memora' : 'Create your second brain today'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="auth-field">
                <label>Your name</label>
                <input
                  type="text"
                  placeholder="Ada Lovelace"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            )}
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="ada@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoFocus={mode === 'login'}
              />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? <span className="loading-dots">Signing in</span>
                : mode === 'login' ? 'Sign in →' : 'Create account →'
              }
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
