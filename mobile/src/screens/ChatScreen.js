import React from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import { commonStyles } from '../styles/commonStyles';

export default function ChatScreen({
  title,
  user,
  roles,
  selectedRole,
  onSelectRole,
  children,
  selectedChildId,
  onSelectChild,
  history,
  message,
  onChangeMessage,
  onSend,
  onPlayAudio,
  loading,
  recording,
  onStartRecording,
  onStopRecording,
  onLogout,
  userType,
}) {
  return (
    <View style={commonStyles.container}>
      <Header title={title} onLogout={onLogout} />
      <Text style={commonStyles.label}>Connecté : {user?.first_name}</Text>

      <Text style={commonStyles.label}>Agent :</Text>
      <ScrollView horizontal style={styles.roles} showsHorizontalScrollIndicator={false}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[styles.roleChip, selectedRole === role.id && styles.roleChipActive]}
            onPress={() => onSelectRole(role.id)}
          >
            <Text style={selectedRole === role.id ? styles.roleTextActive : styles.roleText}>
              {role.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {userType === 'parent' && selectedRole === 'kids_tutor' && children.length > 0 && (
        <View>
          <Text style={commonStyles.label}>Enfant sélectionné pour le tuteur :</Text>
          <ScrollView horizontal style={styles.roles} showsHorizontalScrollIndicator={false}>
            {children.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.roleChip, selectedChildId === c.id && styles.roleChipActive]}
                onPress={() => onSelectChild(c.id)}
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
              <Button title="🔊 Écouter" onPress={() => onPlayAudio(item.audioUrl)} />
            )}
          </View>
        ))}
      </ScrollView>

      <TextInput
        style={commonStyles.input}
        value={message}
        onChangeText={onChangeMessage}
        placeholder="Écrire un message..."
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2e7d32" />
      ) : (
        <View style={commonStyles.row}>
          <View style={commonStyles.button}>
            <Button title="Envoyer" onPress={onSend} />
          </View>
          <TouchableOpacity
            style={[styles.micButton, recording && styles.micButtonActive]}
            onPressIn={onStartRecording}
            onPressOut={onStopRecording}
          >
            <Text style={styles.micText}>{recording ? '🔴' : '🎙️'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
