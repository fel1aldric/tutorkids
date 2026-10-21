import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export const useChildren = () => {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [newChild, setNewChild] = useState({
    first_name: '',
    birth_date: '',
    school_level_code: 'jardin_d_enfants',
    interests: '',
  });
  const [editingChild, setEditingChild] = useState(null);

  const fetchChildren = useCallback(async () => {
    const data = await api('/children/');
    if (Array.isArray(data)) {
      setChildren(data);
      if (data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id);
      }
    }
  }, [selectedChildId]);

  const createChild = async () => {
    if (!newChild.first_name.trim()) return alert('Prénom requis');
    await api('/children/', {
      method: 'POST',
      body: newChild,
    });
    setNewChild({
      first_name: '',
      birth_date: '',
      school_level_code: 'jardin_d_enfants',
      interests: '',
    });
    await fetchChildren();
  };

  const updateChild = async () => {
    if (!editingChild) return;
    await api(`/children/${editingChild.id}`, {
      method: 'PUT',
      body: editingChild,
    });
    setEditingChild(null);
    await fetchChildren();
  };

  const deleteChild = async (id) => {
    await api(`/children/${id}`, { method: 'DELETE' });
    await fetchChildren();
  };

  return {
    children,
    selectedChildId,
    setSelectedChildId,
    newChild,
    setNewChild,
    editingChild,
    setEditingChild,
    fetchChildren,
    createChild,
    updateChild,
    deleteChild,
  };
};
