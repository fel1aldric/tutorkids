import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import ChatScreen from './ChatScreen';
import FocusScreen from './FocusScreen';
import { commonStyles } from '../styles/commonStyles';
import { playAudio } from '../utils/voice';
import { API_URL } from '../config';

export default function ChildScreen({
  user,
  roles,
  chat,
  focus,
  onLogout,
}) {
  const [mode, setMode] = useState('chat');

  useEffect(() => {
    if (!chat.selectedRole) {
      chat.setSelectedRole('kids_tutor');
    }
  }, []);

  return (
    <SafeAreaView style={commonStyles.safe}>
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'chat' && styles.modeBtnActive]}
          onPress={() => setMode('chat')}
        >
          <Text style={mode === 'chat' ? styles.modeTextActive : styles.modeText}>💬 Tuteur</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'focus' && styles.modeBtnActive]}
          onPress={() => setMode('focus')}
        >
          <Text style={mode === 'focus' ? styles.modeTextActive : styles.modeText}>🎯 Concentration</Text>
        </TouchableOpacity>
      </View>

      {mode === 'focus' ? (
        <FocusScreen
          childName={user?.first_name}
          childId={user?.id}
          activeSession={focus.activeSession}
          remainingFormatted={focus.remainingFormatted}
          loading={focus.loading}
          onStart={(min) =>
            focus.startSession({
              durationMinutes: min,
              topic: 'Session avec le tuteur scolaire',
              agentRoleId: chat.selectedRole || 'kids_tutor',
            })
          }
          onEnd={focus.endSession}
        />
      ) : (
        <ChatScreen
          title="Espace Enfant"
          user={user}
          userType="child"
          roles={roles}
          selectedRole={chat.selectedRole}
          onSelectRole={chat.setSelectedRole}
          children={[]}
          message={chat.message}
          onChangeMessage={chat.setMessage}
          history={chat.history}
          onSend={chat.sendTextMessage}
          onPlayAudio={(url) => playAudio(`${API_URL}${url}`)}
          loading={chat.loading}
          recording={chat.recording}
          onStartRecording={chat.beginRecording}
          onStopRecording={chat.finishRecording}
          onLogout={onLogout}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: '#f0f0f0',
  },
  modeBtnActive: {
    backgroundColor: '#2e7d32',
  },
  modeText: {
    color: '#555',
    fontWeight: 'bold',
  },
  modeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
