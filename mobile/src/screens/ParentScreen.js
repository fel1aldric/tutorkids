
import React, { useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

import ChatScreen from './ChatScreen';
import DashboardScreen from './DashboardScreen';
import CalendarScreen from './CalendarScreen';
import MessagesScreen from './MessagesScreen';
import ChildrenScreen from './ChildrenScreen';

import { playAudio } from '../utils/voice';
import { API_URL } from '../config';
import { DEFAULT_PARENT_ROLE } from '../constants';

const tabs = [
  { key: 'home', label: 'Accueil', icon: '🏠' },
  { key: 'chat', label: 'Assistant', icon: '🤖' },
  { key: 'calendar', label: 'Agenda', icon: '📅' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'children', label: 'Enfants', icon: '👨‍👧' },
];

export default function ParentScreen({
  user,
  roles,
  parentTab,
  setParentTab,
  chat,
  children,
  events,
  messages,
  dashboard,
  onLogout,
}) {
  useEffect(() => {
    if (!chat.selectedRole) {
      chat.setSelectedRole(DEFAULT_PARENT_ROLE);
    }
  }, []);

  const handleTabChange = (tab) => {
    setParentTab(tab);

    if (tab === 'home') {
      dashboard.fetchDashboard();
    }

    if (tab === 'calendar') {
      events.fetchEvents();
    }

    if (tab === 'messages') {
      messages.fetchMessageThreads();
      messages.fetchLinkedParents();
    }

    if (tab === 'children') {
      children.fetchChildren();
    }
  };

  const handleOpenMessages = (childId) => {
    setParentTab('messages');

    if (childId) {
      messages.setSelectedMessageChildId(childId);
    }

    messages.fetchMessageThreads();
    messages.fetchLinkedParents();
  };

  const renderScreen = () => {
    switch (parentTab) {
      case 'home':
        return (
          <DashboardScreen
            user={user}
            dashboard={dashboard.dashboard}
            onFetchDashboard={dashboard.fetchDashboard}
            onLogout={onLogout}
            onChangeTab={handleTabChange}
            onOpenMessages={handleOpenMessages}
          />
        );

      case 'calendar':
        return (
          <CalendarScreen
            user={user}
            events={events.events}
            calendarView={events.calendarView}
            setCalendarView={events.setCalendarView}
            selectedCalendarDate={events.selectedCalendarDate}
            setSelectedCalendarDate={events.setSelectedCalendarDate}
            newEvent={events.newEvent}
            setNewEvent={events.setNewEvent}
            children={children.children}
            onFetchEvents={events.fetchEvents}
            onCreateEvent={events.createEvent}
            onDeleteEvent={events.deleteEvent}
            onLogout={onLogout}
            onChangeTab={handleTabChange}
          />
        );

      case 'messages':
        return (
          <MessagesScreen
            user={user}
            messageThreads={messages.messageThreads}
            linkedParents={messages.linkedParents}
            selectedMessageChildId={messages.selectedMessageChildId}
            setSelectedMessageChildId={messages.setSelectedMessageChildId}
            newMessageText={messages.newMessageText}
            setNewMessageText={messages.setNewMessageText}
            selectedRecipientId={messages.selectedRecipientId}
            setSelectedRecipientId={messages.setSelectedRecipientId}
            onFetchThreads={messages.fetchMessageThreads}
            onFetchLinkedParents={messages.fetchLinkedParents}
            onSendMessage={messages.sendFamilyMessage}
            onLogout={onLogout}
            onChangeTab={handleTabChange}
          />
        );

      case 'children':
        return (
          <ChildrenScreen
            user={user}
            children={children.children}
            newChild={children.newChild}
            setNewChild={children.setNewChild}
            editingChild={children.editingChild}
            setEditingChild={children.setEditingChild}
            onFetchChildren={children.fetchChildren}
            onCreateChild={children.createChild}
            onUpdateChild={children.updateChild}
            onDeleteChild={children.deleteChild}
            onLogout={onLogout}
            onChangeTab={handleTabChange}
          />
        );

      default:
        return (
          <ChatScreen
            title="Espace Parent"
            user={user}
            userType="parent"
            roles={roles}
            selectedRole={chat.selectedRole}
            onSelectRole={chat.setSelectedRole}
            children={children.children}
            selectedChildId={children.selectedChildId}
            onSelectChild={children.setSelectedChildId}
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
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>

      {/* CONTENU */}
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {/* BARRE DE NAVIGATION */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingVertical: 8,
        paddingBottom: 10,
        elevation: 10,
      }}>
        {tabs.map((tab) => {
          const active = parentTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabChange(tab.key)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
              }}
            >
              <Text style={{
                fontSize: 21,
                marginBottom: 3,
              }}>
                {tab.icon}
              </Text>

              <Text style={{
                fontSize: 10,
                fontWeight: active ? 'bold' : 'normal',
                color: active ? '#4F46E5' : '#64748B',
              }}>
                {tab.label}
              </Text>

              {active && (
                <View style={{
                  width: 20,
                  height: 3,
                  borderRadius: 5,
                  backgroundColor: '#4F46E5',
                  marginTop: 4,
                }} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

    </SafeAreaView>
  );
}
