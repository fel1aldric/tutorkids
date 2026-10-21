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
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('kids_tutor');
  const [childId, setChildId] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
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
      setRecordingUri(uri);
      recordingRef.current = null;
      await sendVoiceMessage(uri);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const playAudio = async (audioUrl) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
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
    if (childId) formData.append('child_id', childId);
    formData.append('voice', 'true');

    const fileInfo = await FileSystem.getInfoAsync(uri);
    const filename = uri.split('/').pop();

    formData.append('audio_file', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename || 'recording.m4a',
      type: 'audio/m4a',
    });

    try {
      const res = await fetch(`${API_URL}/agents/chat-voice`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setHistory((prev) => [
        ...prev,
        { role: 'user', text: '[message vocal]' },
        { role: 'agent', text: data.response_text, audioUrl: data.response_audio_url },
      ]);
      if (data.response_audio_url) {
        await playAudio(data.response_audio_url);
      }
    } catch (err) {
      console.error('Voice chat failed:', err);
    } finally {
      setLoading(false);
      setRecordingUri(null);
    }
  };

  const sendTextMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);

    const body = {
      role_id: selectedRole,
      message: message.trim(),
      child_id: childId.trim() || undefined,
      voice: true,
    };

    try {
      const res = await fetch(`${API_URL}/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setHistory((prev) => [
        ...prev,
        { role: 'user', text: message },
        { role: 'agent', text: data.response_text, audioUrl: data.response_audio_url },
      ]);
      if (data.response_audio_url) {
        await playAudio(data.response_audio_url);
      }
      setMessage('');
    } catch (err) {
      console.error('Text chat failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TutorKids AI</Text>

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

      <Text style={styles.label}>ID de l'enfant (optionnel) :</Text>
      <TextInput
        style={styles.input}
        value={childId}
        onChangeText={setChildId}
        placeholder="UUID de l'enfant"
      />

      <ScrollView style={styles.history}>
        {history.map((item, index) => (
          <View key={index} style={styles.bubble}>
            <Text style={item.role === 'user' ? styles.userText : styles.agentText}>
              {item.role === 'user' ? 'Moi' : 'Agent'} : {item.text}
            </Text>
            {item.audioUrl && (
              <Button
                title="🔊 Écouter"
                onPress={() => playAudio(item.audioUrl)}
              />
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    marginVertical: 10,
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
  },
  button: {
    flex: 1,
    marginRight: 10,
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
