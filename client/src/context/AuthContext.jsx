import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('memora_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Tell the extension content script we have a token
      window.postMessage({ source: 'memora_web', type: 'MEMORA_SYNC_TOKEN', token }, '*');

      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('memora_token'); delete api.defaults.headers.common['Authorization']; })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('memora_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Sync token to browser extension
    window.postMessage({ source: 'memora_web', type: 'MEMORA_SYNC_TOKEN', token }, '*');
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token, user } = res.data;
    localStorage.setItem('memora_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Sync token to browser extension
    window.postMessage({ source: 'memora_web', type: 'MEMORA_SYNC_TOKEN', token }, '*');
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('memora_token');
    delete api.defaults.headers.common['Authorization'];
    // Clear token from browser extension
    window.postMessage({ source: 'memora_web', type: 'MEMORA_CLEAR_TOKEN' }, '*');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
