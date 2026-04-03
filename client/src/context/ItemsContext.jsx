import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ItemsContext = createContext(null);

export const ItemsProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ type: '', tag: '', collection: '', search: '' });

  const fetchItems = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const query = { ...filters, ...params };
      const res = await api.get('/items', { params: query });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createItem = useCallback(async (itemData) => {
    const res = await api.post('/items', itemData);
    setItems(prev => [res.data.data, ...prev]);
    toast.success('Saved to Memora ✓');
    return res.data;
  }, []);

  const updateItem = useCallback(async (id, updates) => {
    const res = await api.put(`/items/${id}`, updates);
    setItems(prev => prev.map(i => i._id === id ? res.data.data : i));
    return res.data.data;
  }, []);

  // Patch item in local state only (used after reanalyze — data already fresh from server)
  const patchItem = useCallback((id, freshData) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, ...freshData } : i));
  }, []);


  const deleteItem = useCallback(async (id) => {
    await api.delete(`/items/${id}`);
    setItems(prev => prev.filter(i => i._id !== id));
    toast.success('Item deleted');
  }, []);

  const toggleFavorite = useCallback(async (id) => {
    const res = await api.patch(`/items/${id}/favorite`);
    setItems(prev => prev.map(i => i._id === id ? { ...i, isFavorite: res.data.data.isFavorite } : i));
  }, []);

  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  return (
    <ItemsContext.Provider value={{ items, loading, pagination, filters, fetchItems, createItem, updateItem, patchItem, deleteItem, toggleFavorite, applyFilters }}>
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within ItemsProvider');
  return ctx;
};
