import React from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import TabBar from '../components/TabBar';
import { commonStyles } from '../styles/commonStyles';

export default function MessagesScreen({
  user,
  messageThreads,
  linkedParents,
  selectedMessageChildId,
  setSelectedMessageChildId,
  newMessageText,
  setNewMessageText,
  selectedRecipientId,
  setSelectedRecipientId,
  onFetchThreads,
  onFetchLinkedParents,
  onSendMessage,
  onLogout,
  onChangeTab,
}) {
  React.useEffect(() => {
    onFetchThreads();
    onFetchLinkedParents();
  }, []);

  const selectedThread = messageThreads.find(
    (t) => (t.child_id || 'general') === selectedMessageChildId
  );

  return (
    <View style={commonStyles.container}>
      <Header title="Messages familiaux" onLogout={onLogout} />
      <TabBar activeTab="messages" onTabPress={onChangeTab} />

      <ScrollView horizontal style={styles.messageThreadStrip} showsHorizontalScrollIndicator={false}>
        {messageThreads.map((thread) => {
          const key = thread.child_id || 'general';
          const isSelected = selectedMessageChildId === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.messageThreadChip, isSelected && styles.messageThreadChipActive]}
              onPress={() => setSelectedMessageChildId(key)}
            >
              <Text style={isSelected ? styles.messageThreadTextActive : styles.messageThreadText}>
                {thread.child_name || 'Général'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.messageList}>
        {selectedThread ? (
          selectedThread.messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <View
                key={msg.id || idx}
                style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}
              >
                <Text style={styles.messageSender}>
                  {isMe ? 'Moi' : msg.sender_name}
                </Text>
                <Text style={styles.messageContent}>{msg.content}</Text>
                {msg.created_at && (
                  <Text style={styles.messageTime}>
                    {new Date(msg.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={commonStyles.empty}>
            {messageThreads.length === 0
              ? 'Aucun message. Sélectionnez un destinataire ci-dessous pour commencer.'
              : 'Sélectionnez une discussion.'}
          </Text>
        )}
      </ScrollView>

      <View style={styles.messageComposer}>
        {linkedParents.length > 0 && (
          <View style={styles.pickerRow}>
            <Text style={commonStyles.label}>À :</Text>
            {linkedParents.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.recipientChip,
                  selectedRecipientId === p.id && styles.recipientChipActive,
                ]}
                onPress={() => setSelectedRecipientId(p.id)}
              >
                <Text
                  style={
                    selectedRecipientId === p.id
                      ? styles.recipientChipTextActive
                      : styles.recipientChipText
                  }
                >
                  {p.first_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput
          style={commonStyles.input}
          placeholder="Votre message..."
          value={newMessageText}
          onChangeText={setNewMessageText}
          multiline
        />
        <Button
          title="Envoyer"
          onPress={onSendMessage}
          disabled={!newMessageText.trim() || !selectedRecipientId}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageThreadStrip: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  messageThreadChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  messageThreadChipActive: {
    backgroundColor: '#2e7d32',
  },
  messageThreadText: {
    color: '#333',
  },
  messageThreadTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageList: {
    flex: 1,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageBubbleMe: {
    backgroundColor: '#1565c0',
    alignSelf: 'flex-end',
  },
  messageBubbleOther: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageSender: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#fff',
  },
  messageContent: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#e0e0e0',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageComposer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  recipientChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  recipientChipActive: {
    backgroundColor: '#1565c0',
  },
  recipientChipText: {
    fontSize: 12,
    color: '#333',
  },
  recipientChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
