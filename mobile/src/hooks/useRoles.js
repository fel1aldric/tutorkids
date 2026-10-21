import { useState, useCallback } from 'react';
import { API_URL } from '../config';

export const useRoles = () => {
  const [roles, setRoles] = useState([]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/agents/roles`);
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  }, []);

  return {
    roles,
    fetchRoles,
  };
};
