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
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'activity',
    start_at: '',
    end_at: '',
    child_id: '',
    recurrence: '',
  });

  useEffect(() => {
    Audio.requestPermissionsAsync().catch(() => {});
    fetchRoles();
  }, []);

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

  // --- Parent: Calendar / Events ---
  const fetchEvents = async () => {
    const data = await api('/events/');
    if (Array.isArray(data)) setEvents(data);
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
        style={[styles.tab, parentTab === 'children' && styles.tabActive]}
        onPress={() => { setParentTab('children'); fetchChildren(); }}
      >
        <Text style={parentTab === 'children' ? styles.tabTextActive : styles.tabText}>👶 Enfants</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCalendarScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendrier familial</Text>
        <Button title="Déconnexion" onPress={logout} />
      </View>
      {renderParentTabs()}

      <ScrollView style={styles.formSection}>
        <Text style={styles.sectionTitle}>Nouvel événement</Text>
        <TextInput
          style={styles.input}
          placeholder="Titre *"
          value={newEvent.title}
          onChangeText={(t) => setNewEvent({ ...newEvent, title: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          value={newEvent.description}
          onChangeText={(t) => setNewEvent({ ...newEvent, description: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Type (activity, homework, appointment, reminder)"
          value={newEvent.event_type}
          onChangeText={(t) => setNewEvent({ ...newEvent, event_type: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Début * (YYYY-MM-DD HH:MM)"
          value={newEvent.start_at}
          onChangeText={(t) => setNewEvent({ ...newEvent, start_at: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Fin (YYYY-MM-DD HH:MM)"
          value={newEvent.end_at}
          onChangeText={(t) => setNewEvent({ ...newEvent, end_at: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Récurrence (daily, weekly, monthly)"
          value={newEvent.recurrence}
          onChangeText={(t) => setNewEvent({ ...newEvent, recurrence: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="ID enfant (optionnel)"
          value={newEvent.child_id}
          onChangeText={(t) => setNewEvent({ ...newEvent, child_id: t })}
        />
        <Button title="Créer l'événement" onPress={createEvent} />

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Événements</Text>
        {events.length === 0 && <Text style={styles.empty}>Aucun événement.</Text>}
        {events.map((evt) => (
          <View key={evt.id} style={styles.card}>
            <Text style={styles.cardTitle}>{evt.title}</Text>
            <Text style={styles.cardMeta}>{evt.event_type} • {evt.start_at}</Text>
            {evt.end_at && <Text style={styles.cardMeta}>Fin : {evt.end_at}</Text>}
            {evt.description && <Text style={styles.cardMeta}>{evt.description}</Text>}
            {evt.child_id && <Text style={styles.cardMeta}>Enfant : {evt.child_id}</Text>}
            <Button title="Supprimer" color="#d32f2f" onPress={() => deleteEvent(evt.id)} />
          </View>
        ))}
      </ScrollView>
    </View>
  );

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

  const renderParentScreen = () => {
    if (parentTab === 'calendar') return renderCalendarScreen();
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
});
