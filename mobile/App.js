import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// TODO: remplacer par l'IP locale du backend, ex: http://192.168.1.42:8000
const API_URL = 'http://192.168.1.XX:8000';

export default function App() {
  // Navigation: login | parent | child
  const [screen, setScreen] = useState('login');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childId, setChildId] = useState('');
  const [childPin, setChildPin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Roles / Chat
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('kids_tutor');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(null);
  const [sound, setSound] = useState(null);

  // Parent tabs: chat | children | calendar
  const [parentTab, setParentTab] = useState('chat');

  // Children management
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [newChild, setNewChild] = useState({
    first_name: '',
    birth_date: '',
    school_level_code: 'jardin_d_enfants',
    interests: '',
  });
  const [editingChild, setEditingChild] = useState(null);

  // Calendar / events
  const [events, setEvents] = useState([]);
  const [calendarView, setCalendarView] = useState('week'); // 'day' | 'week'
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

  // Family messages
  const [messageThreads, setMessageThreads] = useState([]);
  const [linkedParents, setLinkedParents] = useState([]);
  const [selectedMessageChildId, setSelectedMessageChildId] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [selectedRecipientId, setSelectedRecipientId] = useState(null);

  useEffect(() => {
    Audio.requestPermissionsAsync().catch(() => {});
    registerForPushNotifications();
    fetchRoles();

    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data || {};
      if (data.type === 'family_message') {
        fetchMessageThreads();
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      if (data.type === 'family_message') {
        setParentTab('messages');
        if (data.child_id) {
          setSelectedMessageChildId(data.child_id);
        }
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) return;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'tutorkids',
      });
      const token = tokenData.data;
      if (token) {
        await api('/parents/push-token', {
          method: 'POST',
          body: { push_token: token, push_provider: 'expo' },
        });
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    } catch (err) {
      console.error('Failed to register push token:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/agents/roles`);
      const data = await res.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const api = async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body instanceof FormData ? options.body : typeof options.body === 'object' ? JSON.stringify(options.body) : options.body,
    });
    return res.json().catch(() => ({}));
  };

  const loginParent = async () => {
    setLoading(true);
    const data = await api('/auth/login-parent', {
      method: 'POST',
      body: { email, password },
    });
    if (data.access_token) {
      setToken(data.access_token);
      setUser(data.user);
      setUserType('parent');
      setSelectedRole('mother_schedule');
      setScreen('parent');
      setParentTab('chat');
    } else {
      alert('Échec de connexion parent');
    }
    setLoading(false);
  };

  const registerParent = async () => {
    setLoading(true);
    await api('/auth/register-parent', {
      method: 'POST',
      body: {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      },
    });
    alert('Inscription réussie ! Connectez-vous.');
    setLoading(false);
  };

  const loginChild = async () => {
    setLoading(true);
    const data = await api('/auth/login-child-pin', {
      method: 'POST',
      body: {
        parent_email: email,
        child_id: childId,
        pin: childPin,
      },
    });
    if (data.access_token) {
      setToken(data.access_token);
      setUser(data.user);
      setUserType('child');
      setSelectedRole('kids_tutor');
      setScreen('child');
    } else {
      alert("Échec de connexion enfant (vérifie l'email parent, l'ID et le PIN)");
    }
    setLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setUserType(null);
    setScreen('login');
    setHistory([]);
    setChildren([]);
    setEvents([]);
  };

  // --- Voice helpers ---
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await sendVoiceMessage(uri);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const playAudio = async (audioUrl) => {
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `${API_URL}${audioUrl}` },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  };

  const sendVoiceMessage = async (uri) => {
    if (!uri) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('role_id', selectedRole);
    formData.append('voice', 'true');
    if (userType === 'parent' && selectedRole === 'kids_tutor' && selectedChildId) {
      formData.append('child_id', selectedChildId);
    }
    const filename = uri.split('/').pop();
    formData.append('audio_file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename || 'recording.m4a',
      type: 'audio/m4a',
    });

    try {
      const data = await api('/agents/chat-voice', {
        method: 'POST',
        body: formData,
      });
      setHistory((prev) => [
        ...prev,
        { role: 'user', text: '[message vocal]' },
        { role: 'agent', text: data.response_text, audioUrl: data.response_audio_url },
      ]);
      if (data.response_audio_url) await playAudio(data.response_audio_url);
    } catch (err) {
      console.error('Voice chat failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendTextMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);

    const payload = {
      role_id: selectedRole,
      message: message.trim(),
      voice: true,
    };

    // When a parent talks to the tutor, send the selected child profile context.
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
    if (data.response_audio_url) await playAudio(data.response_audio_url);
    setMessage('');
    setLoading(false);
  };

  // --- Parent: Children ---
  const fetchChildren = async () => {
    const data = await api('/children/');
    if (Array.isArray(data)) {
      setChildren(data);
      if (data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id);
      }
    }
  };

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
    fetchChildren();
  };

  const updateChild = async () => {
    if (!editingChild) return;
    await api(`/children/${editingChild.id}`, {
      method: 'PUT',
      body: editingChild,
    });
    setEditingChild(null);
    fetchChildren();
  };

  const deleteChild = async (id) => {
    await api(`/children/${id}`, { method: 'DELETE' });
    fetchChildren();
  };

  // --- Date helpers ---
  const pad2 = (n) => String(n).padStart(2, '0');

  const formatDateApi = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

  const formatDateTimeApi = (date, time = '00:00') =>
    `${formatDateApi(date)} ${time}`;

  const parseApiDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const getWeekDays = (anchor) => {
    const d = new Date(anchor);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const eventTypeLabel = (type) => {
    const map = {
      activity: 'Activité',
      homework: 'Devoir',
      appointment: 'Rendez-vous',
      reminder: 'Rappel',
    };
    return map[type] || type;
  };

  const eventTypeColor = (type) => {
    const map = {
      activity: '#43a047',
      homework: '#fb8c00',
      appointment: '#1e88e5',
      reminder: '#8e24aa',
    };
    return map[type] || '#757575';
  };

  const shortDayName = (date) =>
    ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];

  const dayMonth = (date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

  const formatTime = (str) => {
    if (!str) return '';
    const m = str.match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}h${m[2]}` : '';
  };

  const renderEventCard = (evt) => {
    const startDate = parseApiDate(evt.start_at);
    const endDate = parseApiDate(evt.end_at);
    const color = eventTypeColor(evt.event_type);
    const childName = evt.child?.first_name ||
      (evt.child_id && children.find((c) => c.id === evt.child_id)?.first_name) ||
      null;

    return (
      <View key={evt.id} style={[styles.eventCard, { borderLeftColor: color, borderLeftWidth: 5 }]}>
        <View style={styles.eventCardHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: color }]}>
            <Text style={styles.eventTypeBadgeText}>{eventTypeLabel(evt.event_type)}</Text>
          </View>
          <Text style={styles.eventTime}>{formatTime(evt.start_at)}</Text>
        </View>
        <Text style={styles.eventTitle}>{evt.title}</Text>
        {evt.description ? <Text style={styles.eventDesc}>{evt.description}</Text> : null}
        <View style={styles.eventFooter}>
          {childName ? <Text style={styles.eventMeta}>👤 {childName}</Text> : null}
          {endDate ? <Text style={styles.eventMeta}>→ fin {dayMonth(endDate)} {formatTime(evt.end_at)}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => deleteEvent(evt.id)} style={styles.eventDelete}>
          <Text style={styles.eventDeleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // --- Parent: Calendar / Events ---
  const fetchEvents = async () => {
    const data = await api('/events/');
    if (Array.isArray(data)) setEvents(data);
  };

  // --- Parent: Family Messages ---
  const fetchMessageThreads = async () => {
    const data = await api('/family-messages/threads');
    if (Array.isArray(data)) {
      setMessageThreads(data);
      if (data.length > 0 && !selectedMessageChildId) {
        const firstWithChild = data.find((t) => t.child_id) || data[0];
        setSelectedMessageChildId(firstWithChild.child_id || 'general');
      }
    }
  };

  const fetchLinkedParents = async () => {
    const data = await api('/family-messages/parents');
    if (Array.isArray(data)) {
      setLinkedParents(data);
      if (data.length > 0 && !selectedRecipientId) {
        setSelectedRecipientId(data[0].id);
      }
    }
  };

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
    fetchMessageThreads();
  };

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
    fetchEvents();
  };

  const deleteEvent = async (id) => {
    await api(`/events/${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  // --- Render helpers ---
  const renderChatScreen = (title) => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Button title="Déconnexion" onPress={logout} />
      </View>
      <Text style={styles.label}>Connecté : {user?.first_name}</Text>

      <Text style={styles.label}>Agent :</Text>
      <ScrollView horizontal style={styles.roles} showsHorizontalScrollIndicator={false}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[styles.roleChip, selectedRole === role.id && styles.roleChipActive]}
            onPress={() => setSelectedRole(role.id)}
          >
            <Text style={selectedRole === role.id ? styles.roleTextActive : styles.roleText}>
              {role.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {userType === 'parent' && selectedRole === 'kids_tutor' && children.length > 0 && (
        <View>
          <Text style={styles.label}>Enfant sélectionné pour le tuteur :</Text>
          <ScrollView horizontal style={styles.roles} showsHorizontalScrollIndicator={false}>
            {children.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.roleChip, selectedChildId === c.id && styles.roleChipActive]}
                onPress={() => setSelectedChildId(c.id)}
              >
                <Text style={selectedChildId === c.id ? styles.roleTextActive : styles.roleText}>
                  {c.first_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.history}>
        {history.map((item, index) => (
          <View key={index} style={styles.bubble}>
            <Text style={item.role === 'user' ? styles.userText : styles.agentText}>
              {item.role === 'user' ? 'Moi' : 'Agent'} : {item.text}
            </Text>
            {item.audioUrl && (
              <Button title="🔊 Écouter" onPress={() => playAudio(item.audioUrl)} />
            )}
          </View>
        ))}
      </ScrollView>

      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Écrire un message..."
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" />
      ) : (
        <View style={styles.row}>
          <View style={styles.button}>
            <Button title="Envoyer" onPress={sendTextMessage} />
          </View>
          <TouchableOpacity
            style={[styles.micButton, recording && styles.micButtonActive]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <Text style={styles.micText}>{recording ? '🔴' : '🎙️'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderParentTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, parentTab === 'chat' && styles.tabActive]}
        onPress={() => setParentTab('chat')}
      >
        <Text style={parentTab === 'chat' ? styles.tabTextActive : styles.tabText}>💬 Agents</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, parentTab === 'calendar' && styles.tabActive]}
        onPress={() => { setParentTab('calendar'); fetchEvents(); }}
      >
        <Text style={parentTab === 'calendar' ? styles.tabTextActive : styles.tabText}>📅 Calendrier</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, parentTab === 'messages' && styles.tabActive]}
        onPress={() => { setParentTab('messages'); fetchMessageThreads(); fetchLinkedParents(); }}
      >
        <Text style={parentTab === 'messages' ? styles.tabTextActive : styles.tabText}>✉️ Messages</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, parentTab === 'children' && styles.tabActive]}
        onPress={() => { setParentTab('children'); fetchChildren(); }}
      >
        <Text style={parentTab === 'children' ? styles.tabTextActive : styles.tabText}>👶 Enfants</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCalendarScreen = () => {
    const weekDays = getWeekDays(selectedCalendarDate);

    const eventsForDay = (date) =>
      events
        .filter((e) => {
          const d = parseApiDate(e.start_at);
          return d && sameDay(d, date);
        })
        .sort((a, b) => a.start_at.localeCompare(b.start_at));

    const shiftWeek = (delta) => {
      const d = new Date(selectedCalendarDate);
      d.setDate(d.getDate() + delta * 7);
      setSelectedCalendarDate(d);
    };

    const shiftDay = (delta) => {
      const d = new Date(selectedCalendarDate);
      d.setDate(d.getDate() + delta);
      setSelectedCalendarDate(d);
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Calendrier familial</Text>
          <Button title="Déconnexion" onPress={logout} />
        </View>
        {renderParentTabs()}

        <View style={styles.calendarToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, calendarView === 'day' && styles.toggleBtnActive]}
            onPress={() => setCalendarView('day')}
          >
            <Text style={calendarView === 'day' ? styles.toggleTextActive : styles.toggleText}>Jour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, calendarView === 'week' && styles.toggleBtnActive]}
            onPress={() => setCalendarView('week')}
          >
            <Text style={calendarView === 'week' ? styles.toggleTextActive : styles.toggleText}>Semaine</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarNav}>
          <Button title="◀" onPress={() => calendarView === 'day' ? shiftDay(-1) : shiftWeek(-1)} />
          <Text style={styles.calendarNavText}>
            {calendarView === 'day'
              ? `${shortDayName(selectedCalendarDate)} ${dayMonth(selectedCalendarDate)}`
              : `Semaine du ${dayMonth(weekDays[0])} au ${dayMonth(weekDays[6])}`}
          </Text>
          <Button title="▶" onPress={() => calendarView === 'day' ? shiftDay(1) : shiftWeek(1)} />
        </View>

        {calendarView === 'week' && (
          <View style={styles.weekStrip}>
            {weekDays.map((d) => {
              const isSelected = sameDay(d, selectedCalendarDate);
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  style={[styles.weekDayBox, isSelected && styles.weekDayBoxActive]}
                  onPress={() => setSelectedCalendarDate(d)}
                >
                  <Text style={styles.weekDayName}>{shortDayName(d)}</Text>
                  <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumActive]}>
                    {pad2(d.getDate())}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <ScrollView style={styles.calendarBody}>
          {calendarView === 'day' ? (
            <View>
              {eventsForDay(selectedCalendarDate).length === 0 && (
                <Text style={styles.empty}>Aucun événement ce jour.</Text>
              )}
              {eventsForDay(selectedCalendarDate).map((evt) => renderEventCard(evt))}
            </View>
          ) : (
            <View style={styles.weekColumns}>
              {weekDays.map((d) => {
                const dayEvents = eventsForDay(d);
                const isSelected = sameDay(d, selectedCalendarDate);
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[
                      styles.weekColumn,
                      isSelected && styles.weekColumnActive,
                      dayEvents.length === 0 && styles.weekColumnEmpty,
                    ]}
                    onPress={() => setSelectedCalendarDate(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.weekColumnDay}>{shortDayName(d)} {dayMonth(d)}</Text>
                    {dayEvents.length === 0 ? (
                      <Text style={styles.weekColumnEmptyText}>-</Text>
                    ) : (
                      dayEvents.slice(0, 3).map((evt) => (
                        <View
                          key={evt.id}
                          style={[
                            styles.weekEventDot,
                            { backgroundColor: eventTypeColor(evt.event_type) },
                          ]}
                        >
                          <Text style={styles.weekEventText} numberOfLines={1}>
                            {formatTime(evt.start_at)} {evt.title}
                          </Text>
                        </View>
                      ))
                    )}
                    {dayEvents.length > 3 && (
                      <Text style={styles.weekMore}>+{dayEvents.length - 3}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.eventForm}>
            <Text style={styles.sectionTitle}>Nouvel événement</Text>
            <TextInput
              style={styles.input}
              placeholder="Titre *"
              value={newEvent.title}
              onChangeText={(t) => setNewEvent({ ...newEvent, title: t })}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Date (YYYY-MM-DD)"
                value={newEvent.start_at.split(' ')[0] || ''}
                onChangeText={(date) => {
                  const time = newEvent.start_at.split(' ')[1] || '';
                  setNewEvent({ ...newEvent, start_at: date ? `${date} ${time}`.trim() : '' });
                }}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Heure (HH:MM)"
                value={newEvent.start_at.split(' ')[1] || ''}
                onChangeText={(time) => {
                  const date = newEvent.start_at.split(' ')[0] || '';
                  setNewEvent({ ...newEvent, start_at: `${date} ${time}`.trim() });
                }}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Fin date"
                value={newEvent.end_at.split(' ')[0] || ''}
                onChangeText={(date) => {
                  const time = newEvent.end_at.split(' ')[1] || '';
                  setNewEvent({ ...newEvent, end_at: date ? `${date} ${time}`.trim() : '' });
                }}
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Fin heure"
                value={newEvent.end_at.split(' ')[1] || ''}
                onChangeText={(time) => {
                  const date = newEvent.end_at.split(' ')[0] || '';
                  setNewEvent({ ...newEvent, end_at: `${date} ${time}`.trim() });
                }}
              />
            </View>
            <View style={styles.pickerRow}>
              {['activity', 'homework', 'appointment', 'reminder'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    newEvent.event_type === t && {
                      backgroundColor: eventTypeColor(t),
                      borderColor: eventTypeColor(t),
                    },
                  ]}
                  onPress={() => setNewEvent({ ...newEvent, event_type: t })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      newEvent.event_type === t && { color: '#fff', fontWeight: 'bold' },
                    ]}
                  >
                    {eventTypeLabel(t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {children.length > 0 && (
              <View style={styles.pickerRow}>
                <Text style={styles.label}>Pour :</Text>
                <TouchableOpacity
                  style={[styles.childChip, !newEvent.child_id && styles.childChipActive]}
                  onPress={() => setNewEvent({ ...newEvent, child_id: '' })}
                >
                  <Text style={!newEvent.child_id ? styles.childChipTextActive : styles.childChipText}>
                    Toute la famille
                  </Text>
                </TouchableOpacity>
                {children.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.childChip,
                      newEvent.child_id === c.id && styles.childChipActive,
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, child_id: c.id })}
                  >
                    <Text
                      style={
                        newEvent.child_id === c.id
                          ? styles.childChipTextActive
                          : styles.childChipText
                      }
                    >
                      {c.first_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newEvent.description}
              onChangeText={(t) => setNewEvent({ ...newEvent, description: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Récurrence (daily, weekly, monthly)"
              value={newEvent.recurrence}
              onChangeText={(t) => setNewEvent({ ...newEvent, recurrence: t })}
            />
            <Button title="Créer l'événement" onPress={createEvent} />
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderChildrenScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes enfants</Text>
        <Button title="Déconnexion" onPress={logout} />
      </View>
      {renderParentTabs()}

      <ScrollView style={styles.formSection}>
        <Text style={styles.sectionTitle}>Ajouter un enfant</Text>
        <TextInput
          style={styles.input}
          placeholder="Prénom *"
          value={newChild.first_name}
          onChangeText={(t) => setNewChild({ ...newChild, first_name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Date de naissance (YYYY-MM-DD)"
          value={newChild.birth_date}
          onChangeText={(t) => setNewChild({ ...newChild, birth_date: t })}
        />
        <View style={styles.pickerRow}>
          {schoolLevels.map((lvl) => (
            <TouchableOpacity
              key={lvl.code}
              style={[
                styles.levelChip,
                newChild.school_level_code === lvl.code && styles.levelChipActive,
              ]}
              onPress={() => setNewChild({ ...newChild, school_level_code: lvl.code })}
            >
              <Text style={newChild.school_level_code === lvl.code ? styles.levelTextActive : styles.levelText}>
                {lvl.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Intérêts"
          value={newChild.interests}
          onChangeText={(t) => setNewChild({ ...newChild, interests: t })}
        />
        <Button title="Ajouter" onPress={createChild} />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Liste des enfants</Text>
        {children.length === 0 && <Text style={styles.empty}>Aucun enfant enregistré.</Text>}
        {children.map((c) => (
          <View key={c.id} style={styles.card}>
            {editingChild?.id === c.id ? (
              <>
                <TextInput
                  style={styles.input}
                  value={editingChild.first_name}
                  onChangeText={(t) => setEditingChild({ ...editingChild, first_name: t })}
                />
                <View style={styles.pickerRow}>
                  {schoolLevels.map((lvl) => (
                    <TouchableOpacity
                      key={lvl.code}
                      style={[
                        styles.levelChip,
                        editingChild.school_level_code === lvl.code && styles.levelChipActive,
                      ]}
                      onPress={() => setEditingChild({ ...editingChild, school_level_code: lvl.code })}
                    >
                      <Text style={editingChild.school_level_code === lvl.code ? styles.levelTextActive : styles.levelText}>
                        {lvl.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={editingChild.interests || ''}
                  onChangeText={(t) => setEditingChild({ ...editingChild, interests: t })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nouveau PIN (4-6 chiffres)"
                  value={editingChild.pin || ''}
                  onChangeText={(t) => setEditingChild({ ...editingChild, pin: t })}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <View style={styles.row}>
                  <Button title="Enregistrer" onPress={updateChild} />
                  <Button title="Annuler" onPress={() => setEditingChild(null)} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>{c.first_name}</Text>
                <Text style={styles.cardMeta}>ID : {c.id}</Text>
                <Text style={styles.cardMeta}>Niveau : {c.school_level_code}</Text>
                {c.birth_date && <Text style={styles.cardMeta}>Né(e) le : {c.birth_date}</Text>}
                {c.interests && <Text style={styles.cardMeta}>Intérêts : {c.interests}</Text>}
                {c.pin_hash && <Text style={styles.cardMeta}>🔒 PIN configuré</Text>}
                {!c.pin_hash && <Text style={styles.cardMeta}>⚠️ PIN non configuré</Text>}
                <View style={styles.row}>
                  <Button title="Modifier" onPress={() => setEditingChild({ ...c, pin: '' })} />
                  <Button title="Supprimer" color="#d32f2f" onPress={() => deleteChild(c.id)} />
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderMessagesScreen = () => {
    const selectedThread = messageThreads.find(
      (t) => (t.child_id || 'general') === selectedMessageChildId
    );

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages familiaux</Text>
          <Button title="Déconnexion" onPress={logout} />
        </View>
        {renderParentTabs()}

        <ScrollView horizontal style={styles.messageThreadStrip} showsHorizontalScrollIndicator={false}>
          {messageThreads.map((thread) => {
            const key = thread.child_id || 'general';
            const isSelected = selectedMessageChildId === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.messageThreadChip, isSelected && styles.messageThreadChipActive]}
                onPress={() => setSelectedMessageChildId(key)}
              >
                <Text style={isSelected ? styles.messageThreadTextActive : styles.messageThreadText}>
                  {thread.child_name || 'Général'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView style={styles.messageList}>
          {selectedThread ? (
            selectedThread.messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <View
                  key={msg.id || idx}
                  style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}
                >
                  <Text style={styles.messageSender}>
                    {isMe ? 'Moi' : msg.sender_name}
                  </Text>
                  <Text style={styles.messageContent}>{msg.content}</Text>
                  {msg.created_at && (
                    <Text style={styles.messageTime}>
                      {new Date(msg.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.empty}>
              {messageThreads.length === 0
                ? 'Aucun message. Sélectionnez un destinataire ci-dessous pour commencer.'
                : 'Sélectionnez une discussion.'}
            </Text>
          )}
        </ScrollView>

        <View style={styles.messageComposer}>
          {linkedParents.length > 0 && (
            <View style={styles.pickerRow}>
              <Text style={styles.label}>À :</Text>
              {linkedParents.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.recipientChip,
                    selectedRecipientId === p.id && styles.recipientChipActive,
                  ]}
                  onPress={() => setSelectedRecipientId(p.id)}
                >
                  <Text
                    style={
                      selectedRecipientId === p.id
                        ? styles.recipientChipTextActive
                        : styles.recipientChipText
                    }
                  >
                    {p.first_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Votre message..."
            value={newMessageText}
            onChangeText={setNewMessageText}
            multiline
          />
          <Button
            title="Envoyer"
            onPress={sendFamilyMessage}
            disabled={!newMessageText.trim() || !selectedRecipientId}
          />
        </View>
      </View>
    );
  };

  const renderParentScreen = () => {
    if (parentTab === 'calendar') return renderCalendarScreen();
    if (parentTab === 'messages') return renderMessagesScreen();
    if (parentTab === 'children') return renderChildrenScreen();
    return (
      <View style={styles.container}>
        {renderChatScreen('Espace Parent')}
        {renderParentTabs()}
      </View>
    );
  };

  const schoolLevels = [
    { code: 'jardin_d_enfants', label: "Jardin d'enfants" },
    { code: 'maternelle_grande', label: 'Grande section' },
    { code: 'cp', label: 'CP' },
    { code: 'ce1', label: 'CE1' },
    { code: 'ce2', label: 'CE2' },
    { code: 'cm1', label: 'CM1' },
    { code: 'cm2', label: 'CM2' },
    { code: 'sixieme', label: '6ème' },
  ];

  // --- Login screen ---
  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.centered}>
          <Text style={styles.title}>TutorKids AI</Text>

          <Text style={styles.sectionTitle}>Parent</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput style={styles.input} placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Nom" value={lastName} onChangeText={setLastName} />
          <View style={styles.row}>
            <Button title="Se connecter" onPress={loginParent} disabled={loading} />
            <Button title="S'inscrire" onPress={registerParent} disabled={loading} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Enfant</Text>
          <Text style={styles.hint}>Demande à tes parents ton code PIN.</Text>
          <TextInput
            style={styles.input}
            placeholder="Email d'un parent"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Ton identifiant (ID)"
            value={childId}
            onChangeText={setChildId}
          />
          <TextInput
            style={styles.input}
            placeholder="Ton code PIN"
            value={childPin}
            onChangeText={setChildPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button title="Se connecter enfant" onPress={loginChild} disabled={loading} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {screen === 'parent' ? renderParentScreen() : renderChatScreen('Espace Enfant')}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  roles: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  roleChipActive: {
    backgroundColor: '#2e7d32',
  },
  roleText: {
    color: '#333',
  },
  roleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  history: {
    flex: 1,
    marginVertical: 10,
  },
  bubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  userText: {
    color: '#1565c0',
  },
  agentText: {
    color: '#2e7d32',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 4,
  },
  button: {
    flex: 1,
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#ef5350',
  },
  micText: {
    fontSize: 26,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    marginTop: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#e8f5e9',
  },
  tabText: {
    color: '#555',
  },
  tabTextActive: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  levelChipActive: {
    backgroundColor: '#1565c0',
  },
  levelText: {
    color: '#333',
    fontSize: 12,
  },
  levelTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  formSection: {
    flex: 1,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  cardMeta: {
    color: '#555',
    marginBottom: 2,
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  calendarToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  toggleBtnActive: {
    backgroundColor: '#2e7d32',
  },
  toggleText: {
    color: '#333',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarNavText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayBox: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 40,
  },
  weekDayBoxActive: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  weekDayName: {
    fontSize: 11,
    color: '#666',
  },
  weekDayNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  weekDayNumActive: {
    color: '#2e7d32',
  },
  calendarBody: {
    flex: 1,
  },
  weekColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weekColumn: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    minHeight: 120,
  },
  weekColumnActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2e7d32',
  },
  weekColumnEmpty: {
    opacity: 0.7,
  },
  weekColumnDay: {
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 12,
  },
  weekColumnEmptyText: {
    color: '#bbb',
    textAlign: 'center',
    marginTop: 30,
  },
  weekEventDot: {
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    marginVertical: 2,
  },
  weekEventText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weekMore: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTypeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventTypeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDesc: {
    color: '#555',
    marginBottom: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  eventMeta: {
    color: '#777',
    fontSize: 12,
  },
  eventDelete: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  eventDeleteText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  eventForm: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputHalf: {
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  typeChipText: {
    fontSize: 12,
    color: '#333',
  },
  childChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  childChipActive: {
    backgroundColor: '#1565c0',
  },
  childChipText: {
    fontSize: 12,
    color: '#333',
  },
  childChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageThreadStrip: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  messageThreadChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  messageThreadChipActive: {
    backgroundColor: '#2e7d32',
  },
  messageThreadText: {
    color: '#333',
  },
  messageThreadTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageList: {
    flex: 1,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageBubbleMe: {
    backgroundColor: '#1565c0',
    alignSelf: 'flex-end',
  },
  messageBubbleOther: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageSender: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#fff',
  },
  messageContent: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#e0e0e0',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageComposer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  recipientChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  recipientChipActive: {
    backgroundColor: '#1565c0',
  },
  recipientChipText: {
    fontSize: 12,
    color: '#333',
  },
  recipientChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
