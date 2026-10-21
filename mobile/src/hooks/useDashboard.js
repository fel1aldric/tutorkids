import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export const useDashboard = () => {
  const [dashboard, setDashboard] = useState(null);

  const fetchDashboard = useCallback(async () => {
    const data = await api('/parents/dashboard');
    if (data && data.date) {
      setDashboard(data);
    }
  }, []);

  return {
    dashboard,
    fetchDashboard,
  };
};
