import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WorkspacesContext = createContext({});

export function WorkspacesProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/workspaces');
      setWorkspaces(data.data);
    } catch (error) {
      console.error('Failed to fetch workspaces', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name, description) => {
    try {
      const { data } = await api.post('/workspaces', { name, description });
      setWorkspaces((prev) => [data.data, ...prev]);
      return data.data;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  return (
    <WorkspacesContext.Provider value={{ workspaces, loading, fetchWorkspaces, createWorkspace }}>
      {children}
    </WorkspacesContext.Provider>
  );
}

export const useWorkspaces = () => useContext(WorkspacesContext);
