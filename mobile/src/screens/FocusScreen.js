import React from 'react';
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const DURATION_PRESETS = [10, 15, 20, 30, 45];

export default function FocusScreen({
  childName,
  childId,
  activeSession,
  remainingFormatted,
  loading,
  onStart,
  onEnd,
}) {
  if (activeSession) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🎯</Text>
        <Text style={styles.title}>Mode Concentration</Text>
        <Text style={styles.subtitle}>{childName ? `Pour ${childName}` : ''}</Text>
        <Text style={styles.timer}>{remainingFormatted}</Text>
        <Text style={styles.topic}>{activeSession.topic || 'Session de travail'}</Text>
        <View style={styles.actions}>
          <Button title="Terminer la session" onPress={() => onEnd('completed')} disabled={loading} />
          <View style={styles.spacer} />
          <Button title="Abandonner" color="#d32f2f" onPress={() => onEnd('abandoned')} disabled={loading} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🧠</Text>
      <Text style={styles.title}>Mode Concentration</Text>
      <Text style={styles.subtitle}>Choisis une durée pour travailler avec le tuteur</Text>

      <View style={styles.presets}>
        {DURATION_PRESETS.map((min) => (
          <TouchableOpacity
            key={min}
            style={styles.presetBtn}
            onPress={() => onStart(min)}
            disabled={loading}
          >
            <Text style={styles.presetText}>{min} min</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  timer: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginVertical: 24,
  },
  topic: {
    fontSize: 18,
    color: '#555',
    marginBottom: 32,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  presetBtn: {
    backgroundColor: '#e8f5e9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
    margin: 6,
  },
  presetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  actions: {
    width: '80%',
  },
  spacer: {
    height: 12,
  },
});
