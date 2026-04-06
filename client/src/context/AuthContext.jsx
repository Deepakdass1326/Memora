import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setUser(res.data.user);
        window.postMessage({ source: 'memora_web', type: 'MEMORA_SYNC_TOKEN', token: 'cookie_managed' }, '*');
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user, token } = res.data;
    window.postMessage({ source: 'memora_web', type: 'MEMORA_SYNC_TOKEN', token }, '*');
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { user, token } = res.data;
    window.postMessage({ source: 'memora_web', type: 'MEMORA_SYNC_TOKEN', token }, '*');
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
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
