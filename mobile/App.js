import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

const API_URL = 'http://192.168.1.XX:8000'; // change with your backend IP

export default function App() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('kids_tutor');
  const [childId, setChildId] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/agents/roles`)
      .then((res) => res.json())
      .then((data) => {
        setRoles(data.roles);
        if (data.roles.length > 0) {
          setSelectedRole(data.roles[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    const body = {
      role_id: selectedRole,
      message: message.trim(),
      child_id: childId.trim() || undefined,
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
        { role: 'agent', text: data.response_text },
      ]);
      setMessage('');
    } catch (err) {
      console.error(err);
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
        <Button title="Envoyer" onPress={sendMessage} />
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
});
