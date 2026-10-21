import { useState, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { startRecording, stopRecording, sendVoiceMessage, playAudio } from '../utils/voice';
import { API_URL } from '../config';

export const useChat = ({ userType, selectedChildId }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(null);

  const sendTextMessage = useCallback(async () => {
    if (!message.trim()) return;
    setLoading(true);

    const payload = {
      role_id: selectedRole,
      message: message.trim(),
      voice: true,
    };

    if (userType === 'parent' && selectedRole === 'kids_tutor' && selectedChildId) {
      payload.child_id = selectedChildId;
    }

    const data = await api('/agents/chat', {
      method: 'POST',
      body: payload,
    });

    setHistory((prev) => [
      ...prev,
      { role: 'user', text: message },
      { role: 'agent', text: data.response_text, audioUrl: data.response_audio_url },
    ]);

    if (data.response_audio_url) {
      await playAudio(`${API_URL}${data.response_audio_url}`);
    }

    setMessage('');
    setLoading(false);
    return data;
  }, [message, selectedRole, userType, selectedChildId]);

  const beginRecording = async () => {
    const recording = await startRecording();
    if (recording) {
      recordingRef.current = recording;
      setRecording(true);
    }
  };

  const finishRecording = async () => {
    if (!recordingRef.current) return;
    setRecording(false);
    const uri = await stopRecording(recordingRef.current);
    recordingRef.current = null;
    if (!uri) return;

    setLoading(true);
    try {
      await sendVoiceMessage({
        uri,
        roleId: selectedRole,
        childId: userType === 'parent' && selectedRole === 'kids_tutor' ? selectedChildId : null,
        apiUrl: API_URL,
        onSuccess: (data) => {
          setHistory((prev) => [
            ...prev,
            { role: 'user', text: '[message vocal]' },
            { role: 'agent', text: data.response_text, audioUrl: data.response_audio_url },
          ]);
        },
      });
    } catch (err) {
      console.error('Voice chat failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedRole,
    setSelectedRole,
    message,
    setMessage,
    history,
    setHistory,
    loading,
    recording,
    sendTextMessage,
    beginRecording,
    finishRecording,
  };
};
