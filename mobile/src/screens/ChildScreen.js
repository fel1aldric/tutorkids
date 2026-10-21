import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import ChatScreen from './ChatScreen';
import { commonStyles } from '../styles/commonStyles';
import { playAudio } from '../utils/voice';
import { API_URL } from '../config';

export default function ChildScreen({
  user,
  roles,
  chat,
  onLogout,
}) {
  useEffect(() => {
    if (!chat.selectedRole) {
      chat.setSelectedRole('kids_tutor');
    }
  }, []);

  return (
    <SafeAreaView style={commonStyles.safe}>
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
    </SafeAreaView>
  );
}
