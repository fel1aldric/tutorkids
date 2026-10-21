import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export const useMessages = () => {
  const [messageThreads, setMessageThreads] = useState([]);
  const [linkedParents, setLinkedParents] = useState([]);
  const [selectedMessageChildId, setSelectedMessageChildId] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedRecipientId, setSelectedRecipientId] = useState(null);

  const fetchMessageThreads = useCallback(async () => {
    const data = await api('/family-messages/threads');
    if (Array.isArray(data)) {
      setMessageThreads(data);
      if (data.length > 0 && !selectedMessageChildId) {
        const firstWithChild = data.find((t) => t.child_id) || data[0];
        setSelectedMessageChildId(firstWithChild.child_id || 'general');
      }
    }
  }, [selectedMessageChildId]);

  const fetchLinkedParents = useCallback(async () => {
    const data = await api('/family-messages/parents');
    if (Array.isArray(data)) {
      setLinkedParents(data);
      if (data.length > 0 && !selectedRecipientId) {
        setSelectedRecipientId(data[0].id);
      }
    }
  }, [selectedRecipientId]);

  const sendFamilyMessage = async () => {
    if (!newMessageText.trim()) return;
    if (!selectedRecipientId) return alert('Sélectionnez un parent destinataire');

    await api('/family-messages/', {
      method: 'POST',
      body: {
        content: newMessageText.trim(),
        recipient_parent_id: selectedRecipientId,
        child_id: selectedMessageChildId === 'general' ? null : selectedMessageChildId,
      },
    });
    setNewMessageText('');
    await fetchMessageThreads();
  };

  return {
    messageThreads,
    linkedParents,
    selectedMessageChildId,
    setSelectedMessageChildId,
    newMessageText,
    setNewMessageText,
    selectedRecipientId,
    setSelectedRecipientId,
    fetchMessageThreads,
    fetchLinkedParents,
    sendFamilyMessage,
  };
};
