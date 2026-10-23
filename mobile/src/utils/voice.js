import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';
import { api } from './api';

let currentPlayer = null;

const releasePlayer = () => {
  if (!currentPlayer) return;
  try {
    currentPlayer.pause();
    currentPlayer.remove();
  } catch (_) {}
  currentPlayer = null;
};

export const setCurrentSound = (player) => {
  currentPlayer = player;
};

export const stopAudio = releasePlayer;

export const playAudio = async (audioUrl) => {
  try {
    releasePlayer();
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    const player = createAudioPlayer({ uri: audioUrl });
    currentPlayer = player;
    player.play();
    return player;
  } catch (err) {
    console.error('Failed to play audio:', err);
    return null;
  }
};

export const startRecording = async () => {
  try {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      console.warn('Microphone permission denied');
      return null;
    }
    releasePlayer();
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();
    return recorder;
  } catch (err) {
    console.error('Failed to start recording:', err);
    return null;
  }
};

export const stopRecording = async (recorder) => {
  if (!recorder) return null;
  try {
    await recorder.stop();
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    return recorder.uri;
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