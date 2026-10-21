import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { api } from './api';

let currentSound = null;

export const setCurrentSound = (sound) => {
  currentSound = sound;
};

export const playAudio = async (audioUrl) => {
  try {
    if (currentSound) await currentSound.unloadAsync();
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: true }
    );
    currentSound = newSound;
    return newSound;
  } catch (err) {
    console.error('Failed to play audio:', err);
    return null;
  }
};

export const startRecording = async () => {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    return recording;
  } catch (err) {
    console.error('Failed to start recording:', err);
    return null;
  }
};

export const stopRecording = async (recording) => {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    return recording.getURI();
  } catch (err) {
    console.error('Failed to stop recording:', err);
    return null;
  }
};

export const sendVoiceMessage = async ({
  uri,
  roleId,
  childId,
  onSuccess,
  apiUrl,
}) => {
  if (!uri) return;

  const formData = new FormData();
  formData.append('role_id', roleId);
  formData.append('voice', 'true');
  if (childId) formData.append('child_id', childId);

  const filename = uri.split('/').pop();
  formData.append('audio_file', {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name: filename || 'recording.m4a',
    type: 'audio/m4a',
  });

  const data = await api(`${apiUrl}/agents/chat-voice`, {
    method: 'POST',
    body: formData,
  });

  if (data.response_audio_url) {
    await playAudio(`${apiUrl}${data.response_audio_url}`);
  }

  onSuccess?.(data);
  return data;
};
