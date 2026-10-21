import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../utils/api';

export const useFocus = ({ childId }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const clearFocusInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchActiveSession = useCallback(async () => {
    if (!childId) return;
    try {
      const data = await api('/focus/active');
      if (data && data.id) {
        setActiveSession(data);
        const end = new Date(data.started_at);
        end.setMinutes(end.getMinutes() + data.duration_minutes);
        const remaining = Math.max(0, Math.floor((end - new Date()) / 1000));
        setRemainingSeconds(remaining);
        return data;
      }
    } catch (err) {
      // No active session is expected.
      return null;
    }
  }, [childId]);

  const startFocusTimer = useCallback(() => {
    clearFocusInterval();
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearFocusInterval();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearFocusInterval]);

  const startSession = useCallback(async ({ durationMinutes, topic, agentRoleId }) => {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await api(`/focus/${childId}/start`, {
        method: 'POST',
        body: {
          duration_minutes: durationMinutes,
          topic,
          agent_role_id: agentRoleId,
        },
      });
      if (data && data.id) {
        setActiveSession(data);
        setRemainingSeconds((data.duration_minutes || durationMinutes) * 60);
        startFocusTimer();
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, [childId, startFocusTimer]);

  const endSession = useCallback(async (status = 'completed', summary = '') => {
    if (!activeSession) return;
    setLoading(true);
    clearFocusInterval();
    try {
      const data = await api(`/focus/${activeSession.id}/end`, {
        method: 'POST',
        body: { status, summary },
      });
      setActiveSession(null);
      setRemainingSeconds(0);
      return data;
    } finally {
      setLoading(false);
    }
  }, [activeSession, clearFocusInterval]);

  useEffect(() => {
    fetchActiveSession();
    return clearFocusInterval;
  }, [fetchActiveSession, clearFocusInterval]);

  useEffect(() => {
    if (activeSession && remainingSeconds > 0) {
      startFocusTimer();
    }
  }, [activeSession, remainingSeconds, startFocusTimer]);

  const formatRemaining = () => {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return {
    activeSession,
    remainingSeconds,
    remainingFormatted: formatRemaining(),
    loading,
    startSession,
    endSession,
    fetchActiveSession,
  };
};
