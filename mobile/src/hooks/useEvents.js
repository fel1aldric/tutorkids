import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [calendarView, setCalendarView] = useState('week');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'activity',
    start_at: '',
    end_at: '',
    child_id: '',
    recurrence: '',
  });

  const fetchEvents = useCallback(async () => {
    const data = await api('/events/');
    if (Array.isArray(data)) setEvents(data);
  }, []);

  const createEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.start_at.trim()) {
      return alert('Titre et date/heure de début requis');
    }
    await api('/events/', {
      method: 'POST',
      body: newEvent,
    });
    setNewEvent({
      title: '',
      description: '',
      event_type: 'activity',
      start_at: '',
      end_at: '',
      child_id: '',
      recurrence: '',
    });
    await fetchEvents();
  };

  const deleteEvent = async (id) => {
    await api(`/events/${id}`, { method: 'DELETE' });
    await fetchEvents();
  };

  return {
    events,
    calendarView,
    setCalendarView,
    selectedCalendarDate,
    setSelectedCalendarDate,
    newEvent,
    setNewEvent,
    fetchEvents,
    createEvent,
    deleteEvent,
  };
};
