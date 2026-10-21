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
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const API_URL = 'http://192.168.1.XX:8000'; // TODO: replace with your backend IP

export default function App() {
  const [screen, setScreen] = useState('login'); // login, parent, child
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childId, setChildId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Chat fields
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('kids_tutor');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recordingRef = useRef(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    Audio.requestPermissionsAsync().catch(() => {});
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/agents/roles`);
      const data = await res.json();
      setRoles(data.roles);
      if (data.roles.length > 0) {
        setSelectedRole(data.roles[0].id);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const apiPost = async (path, body, auth = true) => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const loginParent = async () => {
    setLoading(true);
    try {
      const data = await apiPost('/auth/login-parent', { email, password }, false);
      if (data.access_token) {
        setToken(data.access_token);
        setUser(data.user);
        setScreen('parent');
      } else {
        alert('Login failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const registerParent = async () => {
    setLoading(true);
    try {
      await apiPost('/auth/register-parent', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      }, false);
      alert('Registered! Now login.');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginChild = async () => {
    setLoading(true);
    try {
      const data = await apiPost('/auth/login-child', { child_id: childId }, false);
      if (data.access_token) {
        setToken(data.access_token);
        setUser(data.user);
        setScreen('child');
      } else {
        alert('Child login failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setScreen('login');
    setHistory([]);
  };

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

    const filename = uri.split('/').pop();
    formData.append('audio_file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename || 'recording.m4a',
      type: 'audio/m4a',
    });

    try {
      const res = await fetch(`${API_URL}/agents/chat-voice`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
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

    const body = {
      role_id: selectedRole,
      message: message.trim(),
      voice: true,
    };

    try {
      const data = await apiPost('/agents/chat', body, true);
      setHistory((prev) => [
        ...prev,
        { role: 'user', text: message },
        { role: 'agent', text: data.response_text, audioUrl: data.response_audio_url },
      ]);
      if (data.response_audio_url) await playAudio(data.response_audio_url);
      setMessage('');
    } catch (err) {
      console.error('Text chat failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const ChatScreen = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TutorKids AI</Text>
        <Button title="Déconnexion" onPress={logout} />
      </View>
      <Text style={styles.label}>Connecté en tant que : {user?.first_name}</Text>

      <Text style={styles.label}>Agent :</Text>
      <View style={styles.roles}>
        {roles.map((role) => (
          <Button
            key={role.id}
            title={role.name}
            onPress={() => setSelectedRole(role.id)}
            color={selectedRole === role.id ? '#2e7d32' : '#888'}
          />
        ))}
      </View>

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

  if (screen === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.centered}>
        <Text style={styles.title}>TutorKids AI</Text>

        <Text style={styles.sectionTitle}>Parent</Text>
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
        <TextInput style={styles.input} placeholder="Nom" value={lastName} onChangeText={setLastName} />
        <View style={styles.row}>
          <Button title="Se connecter" onPress={loginParent} disabled={loading} />
          <Button title="S'inscrire" onPress={registerParent} disabled={loading} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Enfant</Text>
        <TextInput style={styles.input} placeholder="ID de l'enfant" value={childId} onChangeText={setChildId} />
        <Button title="Se connecter enfant" onPress={loginChild} disabled={loading} />
      </ScrollView>
    );
  }

  return <ChatScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  roles: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#ef5350',
  },
  micText: {
    fontSize: 28,
  },
});
